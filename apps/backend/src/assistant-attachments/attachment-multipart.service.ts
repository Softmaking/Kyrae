import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import busboy from 'busboy';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { isUUID } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { AssistantAttachmentsService } from './assistant-attachments.service';
import { AssistantAttachment } from './attachment.entities';
import { StoredOriginal } from './filesystem-attachment-storage.service';
import { attachmentError } from './attachment.errors';

@Injectable()
export class AttachmentMultipartService {
  constructor(private readonly attachments: AssistantAttachmentsService) {}

  async upload(req: Request, batchId: string, owner: string) {
    const batch = await this.attachments.ownedBatch(batchId, owner);
    this.attachments.assertOpen(batch);
    if (
      req.rawHeaders.length > 64 ||
      req.rawHeaders.reduce((n, s) => n + Buffer.byteLength(s), 0) > 8192
    )
      throw attachmentError('ATTACHMENT_UPLOAD_FAILED', 400);
    if (Number(req.headers['content-length'] ?? 0) > 22_020_096)
      throw attachmentError('ATTACHMENT_TOO_LARGE', 413);
    let parser: ReturnType<typeof busboy>;
    try {
      parser = busboy({
        headers: req.headers,
        preservePath: true,
        defParamCharset: 'utf8',
        limits: {
          files: 1,
          fields: 1,
          parts: 3,
          fieldSize: 128,
          fieldNameSize: 32,
          fileSize: 20_971_521,
          headerPairs: 16,
        },
      });
    } catch {
      throw attachmentError('ATTACHMENT_UPLOAD_FAILED', 400);
    }
    parser.on('error', () => {});
    let row: AssistantAttachment | undefined;
    let stored: StoredOriginal | undefined;
    let clientId: string | undefined;
    let files = 0;
    let fields = 0;
    let total = 0;
    let failure: Error | undefined;
    let work: Promise<void> | undefined;
    let candidateKey: string | undefined;
    let fileStream: Readable | undefined;
    const fail = (e: unknown) => {
      const error = e instanceof Error ? e : new Error('upload');
      failure ??= error;
      fileStream?.destroy(error);
      parser.destroy(error);
    };
    const counter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        total += chunk.length;
        if (total > 22_020_096) callback(attachmentError('ATTACHMENT_TOO_LARGE', 413));
        else callback(null, chunk);
      },
    });
    const deadline = setTimeout(
      () => fail(attachmentError('ATTACHMENT_UPLOAD_FAILED', 408, true)),
      300_000
    );
    let idle = setTimeout(
      () => fail(attachmentError('ATTACHMENT_UPLOAD_FAILED', 408, true)),
      60_000
    );
    const touch = () => {
      clearTimeout(idle);
      idle = setTimeout(() => fail(attachmentError('ATTACHMENT_UPLOAD_FAILED', 408, true)), 60_000);
    };
    counter.on('data', touch);
    parser.on('field', (name, value, info) => {
      if (
        ++fields !== 1 ||
        name !== 'clientFileId' ||
        info.valueTruncated ||
        info.nameTruncated ||
        !isUUID(value) ||
        Buffer.byteLength(value) > 128
      )
        return fail(attachmentError('ATTACHMENT_UPLOAD_FAILED', 400));
      clientId = value;
    });
    parser.on('file', (name, stream, info) => {
      fileStream = stream;
      if (++files !== 1 || name !== 'file') {
        stream.resume();
        return fail(attachmentError('ATTACHMENT_UPLOAD_FAILED', 400));
      }
      stream.on('limit', () => fail(attachmentError('ATTACHMENT_TOO_LARGE', 413)));
      stream.on('error', () => {});
      work = (async () => {
        row = await this.attachments.beginUpload(batchId, owner, info.filename, clientId);
        candidateKey = row.lifecycle === 'ready' ? randomUUID() : row.original_key;
        stored = await this.attachments.storage.write(stream, candidateKey);
      })().catch((e) => {
        fail(e);
      });
    });
    parser.on('filesLimit', () => fail(attachmentError('ATTACHMENT_COUNT_EXCEEDED', 400)));
    parser.on('fieldsLimit', () => fail(attachmentError('ATTACHMENT_UPLOAD_FAILED', 400)));
    parser.on('partsLimit', () => fail(attachmentError('ATTACHMENT_UPLOAD_FAILED', 400)));
    try {
      req.pipe(counter);
      req.on('aborted', aborted);
      req.on('error', fail);
      await pipeline(counter, parser);
      await work;
      if (failure) throw failure;
      if (!row || !stored || !clientId || files !== 1 || fields !== 1)
        throw attachmentError('ATTACHMENT_UPLOAD_FAILED', 400);
      if (row.lifecycle === 'ready') {
        const existing = await this.attachments.db.getRepository(AssistantAttachment).findOneBy({
          batch_id: batchId,
          owner_id: owner,
          client_file_id: clientId,
          lifecycle: 'ready',
        });
        if (
          !existing ||
          existing.original_filename !== row.original_filename ||
          existing.sha256 !== stored.sha256 ||
          Number(existing.byte_size) !== stored.byteSize
        )
          throw attachmentError('ATTACHMENT_IDEMPOTENCY_CONFLICT');
        await this.attachments.storage.delete(stored.key);
        return this.attachments.descriptor(existing.id, owner);
      }
      return await this.attachments.finishUpload(row, owner, clientId, stored);
    } catch (e) {
      parser.destroy();
      await work;
      if (row?.lifecycle === 'uploading') await this.attachments.abandonUpload(row);
      else if (candidateKey) await this.attachments.storage.delete(candidateKey);
      throw (
        failure ??
        (e instanceof Error && 'getStatus' in e
          ? e
          : attachmentError('ATTACHMENT_UPLOAD_FAILED', 400, true))
      );
    } finally {
      clearTimeout(deadline);
      clearTimeout(idle);
      counter.off('data', touch);
      req.unpipe(counter);
      req.off('aborted', aborted);
      req.off('error', fail);
    }
    function aborted() {
      fail(attachmentError('ATTACHMENT_UPLOAD_FAILED', 400, true));
    }
  }
}
