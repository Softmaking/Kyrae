import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { AssistantAttachmentJob } from './attachment.entities';

@Injectable()
export class AttachmentJobsService {
  readonly owner = randomUUID();
  constructor(private readonly db: DataSource) {}

  async claim(kind: 'dispatch' | 'delete'): Promise<AssistantAttachmentJob | null> {
    return this.db.transaction(async (em) => {
      // Stale dispatch is never reclaimed: it may already have reached the runtime.
      const rows: AssistantAttachmentJob[] = await em.query(
        `SELECT j.* FROM assistant_attachment_jobs j
        WHERE j.kind=$1 AND j.next_run_at<=now() AND (j.state='pending' OR ($1='delete' AND j.state='running' AND j.lease_until<now()))
        AND ($1<>'dispatch' OR NOT EXISTS (
          SELECT 1 FROM assistant_attachment_jobs other JOIN assistant_message_tasks ot ON ot.id=other.task_id
          JOIN assistant_message_tasks t ON t.id=j.task_id WHERE other.kind='dispatch' AND other.id<>j.id
          AND ot.conversation_id=t.conversation_id AND other.state IN ('pending','running')
          AND (other.state='running' OR (other.created_at,other.id)<(j.created_at,j.id))))
        ORDER BY j.created_at,j.id FOR UPDATE OF j SKIP LOCKED LIMIT 1`,
        [kind]
      );
      if (!rows.length) return null;
      const claimed: AssistantAttachmentJob[] = await em.query(
        `UPDATE assistant_attachment_jobs SET state='running', attempts=attempts+1, generation=generation+1,
        lease_owner=$2,lease_until=now()+interval '60 seconds',updated_at=now() WHERE id=$1 RETURNING *`,
        [rows[0].id, this.owner]
      );
      return claimed[0];
    });
  }

  async fenced(em: EntityManager, job: AssistantAttachmentJob): Promise<boolean> {
    const rows: unknown[] = await em.query(
      `SELECT id FROM assistant_attachment_jobs WHERE id=$1 AND state='running' AND lease_owner=$2 AND generation=$3 AND lease_until>now() FOR UPDATE`,
      [job.id, this.owner, job.generation]
    );
    return !!rows.length;
  }

  async heartbeat(job: AssistantAttachmentJob): Promise<boolean> {
    const rows: unknown[] = await this.db.query(
      `UPDATE assistant_attachment_jobs SET lease_until=now()+interval '60 seconds',updated_at=now() WHERE id=$1 AND generation=$2 AND lease_owner=$3 AND state='running' AND lease_until>now() RETURNING id`,
      [job.id, job.generation, this.owner]
    );
    return !!rows.length;
  }

  async finish(
    em: EntityManager,
    job: AssistantAttachmentJob,
    state: 'completed' | 'failed' | 'pending',
    code: string | null = null
  ): Promise<void> {
    await em.query(
      `UPDATE assistant_attachment_jobs SET state=$4,error_code=$5,lease_until=NULL,lease_owner=NULL,next_run_at=now()+interval '2 seconds',updated_at=now() WHERE id=$1 AND generation=$2 AND lease_owner=$3 AND state='running'`,
      [job.id, job.generation, this.owner, state, code]
    );
  }
}
