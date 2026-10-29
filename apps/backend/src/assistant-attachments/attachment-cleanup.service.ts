import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { AssistantAttachmentsService } from './assistant-attachments.service';
import {
  AssistantAttachment,
  AssistantAttachmentDerivative,
  AssistantUploadBatch,
} from './attachment.entities';
import { AttachmentJobsService } from './attachment-jobs.service';
import { FilesystemAttachmentStorage } from './filesystem-attachment-storage.service';

@Injectable()
export class AttachmentCleanupService {
  private deleting = false;
  constructor(
    private readonly db: DataSource,
    private readonly attachments: AssistantAttachmentsService,
    private readonly jobs: AttachmentJobsService,
    private readonly storage: FilesystemAttachmentStorage
  ) {}

  @Cron('0 */15 * * * *')
  async expire(): Promise<void> {
    await this.db.transaction(async (em) => {
      const batches: AssistantUploadBatch[] = await em.query(
        `SELECT * FROM assistant_upload_batches WHERE state='open' AND expires_at<now() ORDER BY expires_at FOR UPDATE SKIP LOCKED LIMIT 100`
      );
      for (const batch of batches) {
        const active: unknown[] = await em.query(
          `SELECT id FROM assistant_attachments WHERE batch_id=$1 AND lifecycle='uploading' AND upload_lease_until>now()`,
          [batch.id]
        );
        if (active.length) continue;
        const files = await em
          .getRepository(AssistantAttachment)
          .find({ where: { batch_id: batch.id } });
        for (const f of files)
          if (!f.message_id && ['ready', 'uploading'].includes(f.lifecycle))
            await this.attachments.markDelete(em, f);
        await em.query(
          `UPDATE assistant_upload_batches SET state='expired',reserved_count=0,reserved_bytes=0,updated_at=now() WHERE id=$1`,
          [batch.id]
        );
      }
      const stale: AssistantAttachment[] = await em.query(
        `SELECT a.* FROM assistant_attachments a JOIN assistant_upload_batches b ON b.id=a.batch_id WHERE b.state='open' AND a.lifecycle='uploading' AND a.upload_lease_until<now() FOR UPDATE OF b,a SKIP LOCKED LIMIT 100`
      );
      for (const f of stale) {
        await this.attachments.markDelete(em, em.getRepository(AssistantAttachment).create(f));
        await em.query(
          `UPDATE assistant_upload_batches SET reserved_count=reserved_count-1,reserved_bytes=reserved_bytes-20971520,updated_at=now() WHERE id=$1`,
          [f.batch_id]
        );
      }
    });
  }

  @Cron('*/2 * * * * *')
  async deleteNext(): Promise<void> {
    if (this.deleting) return;
    this.deleting = true;
    let timer: NodeJS.Timeout | undefined;
    try {
      const job = await this.jobs.claim('delete');
      if (!job) return;
      timer = setInterval(() => {
        void this.jobs.heartbeat(job).catch(() => false);
      }, 15_000);
      try {
        const f = await this.db
          .getRepository(AssistantAttachment)
          .findOneByOrFail({ id: job.attachment_id! });
        if (f.message_id || f.lifecycle !== 'deleting') throw new Error('retained');
        // Wait for the bounded active writer to settle before unlinking an unpublished object.
        if (f.updated_at.getTime() + 310_000 > Date.now()) {
          await this.db.transaction(async (em) => {
            if (await this.jobs.fenced(em, job)) await this.jobs.finish(em, job, 'pending');
          });
          return;
        }
        const derivatives = await this.db
          .getRepository(AssistantAttachmentDerivative)
          .findBy({ attachment_id: f.id });
        await this.storage.delete(f.original_key);
        for (const d of derivatives) await this.storage.delete(d.storage_key);
        await this.db.transaction(async (em) => {
          if (!(await this.jobs.fenced(em, job))) return;
          await em.delete(AssistantAttachmentDerivative, { attachment_id: f.id });
          await em.update(AssistantAttachment, { id: f.id }, { lifecycle: 'expired' });
          await this.jobs.finish(em, job, 'completed');
        });
      } catch {
        await this.db.transaction(async (em) => {
          if (await this.jobs.fenced(em, job))
            await this.jobs.finish(
              em,
              job,
              job.attempts < 2 ? 'pending' : 'failed',
              'ATTACHMENT_STORAGE_UNAVAILABLE'
            );
        });
      }
    } finally {
      if (timer) clearInterval(timer);
      this.deleting = false;
    }
  }

  @Cron('0 17 * * * *')
  async reconcile(): Promise<void> {
    // Expired rows intentionally keep bookkeeping; only unreferenced opaque objects qualify.
    for await (const key of this.storage.orphans(new Date(Date.now() - 172_800_000))) {
      await this.db.transaction(async (em) => {
        await em.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, [
          `attachment-object:${key}`,
        ]);
        const references: unknown[] = await em.query(
          `SELECT id FROM assistant_attachments WHERE original_key=$1 UNION ALL SELECT id FROM assistant_attachment_derivatives WHERE storage_key=$1 LIMIT 1`,
          [key]
        );
        if (!references.length) await this.storage.delete(key);
      });
    }
  }
}
