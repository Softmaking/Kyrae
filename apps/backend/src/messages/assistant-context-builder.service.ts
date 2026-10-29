import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  AgentChatMessage,
  AgentContentPart,
  AssistantContextManifestDto,
  AttachmentSourceLocator,
} from '@kyrae/shared-contracts';
import { ASSISTANT_ATTACHMENT_CONSTRAINTS as C } from '@kyrae/shared-contracts';
import {
  AssistantAttachment,
  AssistantAttachmentDerivative,
} from '../assistant-attachments/attachment.entities';
import { FilesystemAttachmentStorage } from '../assistant-attachments/filesystem-attachment-storage.service';
import { AssistantAccessPolicy } from '../assistant-attachments/assistant-access-policy.service';
import { AttachmentModelProfile } from '../agents/attachment-model-profile.service';
import {
  ATTACHMENT_PROTOCOL,
  ATTACHMENT_SYSTEM_POLICY,
  serializeAttachmentRequest,
} from '../agents/attachment-hermes.protocol';
import { attachmentError } from '../assistant-attachments/attachment.errors';

function quote(value: unknown): string {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
  );
}
function locator(value: unknown): value is AttachmentSourceLocator {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const integer = (n: unknown) => Number.isSafeInteger(n) && Number(n) > 0;
  if (v.kind === 'image') return integer(v.frame);
  if (v.kind === 'sheet')
    return (
      typeof v.sheet === 'string' &&
      v.sheet.length <= 255 &&
      integer(v.startRow) &&
      integer(v.endRow) &&
      Number(v.endRow) >= Number(v.startRow)
    );
  if (['lines', 'pages', 'document'].includes(String(v.kind)))
    return (
      integer(v.start) &&
      integer(v.end) &&
      Number(v.end) >= Number(v.start) &&
      (v.kind !== 'document' || typeof v.section === 'string')
    );
  return false;
}

@Injectable()
export class AssistantContextBuilder {
  constructor(
    private readonly db: DataSource,
    private readonly storage: FilesystemAttachmentStorage,
    private readonly access: AssistantAccessPolicy
  ) {}

  async build(
    owner: string,
    conversationId: string,
    messageId: string,
    profile: AttachmentModelProfile
  ): Promise<{ messages: AgentChatMessage[]; manifest: AssistantContextManifestDto }> {
    await this.access.conversation(conversationId, owner);
    const rows: Array<{ id: string; role: string; content: string }> = await this.db.query(
      `SELECT m.id,m.role,m.content FROM messages m WHERE m.conversation_id=$1 AND (m.created_at,m.id)<=(SELECT created_at,id FROM messages WHERE id=$2 AND conversation_id=$1) ORDER BY m.created_at,m.id`,
      [conversationId, messageId]
    );
    const current = rows.find((m) => m.id === messageId);
    if (!current || !current.content.isWellFormed())
      throw attachmentError('ATTACHMENTS_CONTEXT_LIMIT', 422);
    const files: AssistantAttachment[] = await this.db.query(
      `SELECT a.* FROM assistant_attachments a JOIN messages m ON m.id=a.message_id WHERE a.conversation_id=$1 AND a.owner_id=$2 AND a.lifecycle='attached' AND (m.created_at,m.id)<=(SELECT created_at,id FROM messages WHERE id=$3) ORDER BY (a.message_id=$3) DESC,m.created_at DESC,a.ordinal`,
      [conversationId, owner, messageId]
    );
    const manifest: AssistantContextManifestDto = {
      version: 1,
      protocolVersion: ATTACHMENT_PROTOCOL,
      profileVersion: profile.version,
      provider: 'HERMES',
      resolvedModel: profile.model,
      status: 'prepared',
      cutoffMessageId: messageId,
      files: [],
      selectedAttachmentIds: [],
      includedHistoryMessageIds: [],
      omittedHistoryMessageIds: [],
      omissions: [],
      truncated: false,
      budget: C,
      accounting: {
        textMode: 'conservative_estimate',
        imageMode: 'verified_upper_bound',
        suppliedInputTokens: null,
        imageTokens: 0,
        serializedRequestBytes: null,
        combinedTextUtf16Units: null,
        evidenceVersion: profile.evidenceVersion,
      },
      createdAt: new Date().toISOString(),
    };
    const history: unknown[] = [];
    let historyBytes = 0;
    for (const m of rows
      .filter((r) => r.id !== messageId && ['user', 'assistant'].includes(r.role))
      .reverse()) {
      const record = { messageId: m.id, provenanceRole: m.role, text: m.content };
      const n = Buffer.byteLength(quote(record));
      if (m.content.isWellFormed() && historyBytes + n <= 4000) {
        history.unshift(record);
        historyBytes += n;
        manifest.includedHistoryMessageIds.unshift(m.id);
      } else {
        manifest.omittedHistoryMessageIds.unshift(m.id);
        manifest.omissions.push({
          attachmentId: null,
          messageId: m.id,
          locator: null,
          reason: 'history_budget',
        });
      }
    }
    const records: unknown[] = [];
    const images: AgentContentPart[] = [];
    let attachmentBudget = 16_000;
    let imageTokens = 0;
    const newCount = files.filter((f) => f.message_id === messageId).length;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const usage: AssistantContextManifestDto['files'][number] = {
        attachmentId: f.id,
        processingVersion: f.processing_version,
        status: 'excluded',
        included: [],
      };
      manifest.files.push(usage);
      const omit = (
        reason: 'processing_failed' | 'context_budget' | 'source_unavailable',
        source: AttachmentSourceLocator | null = null
      ) => {
        manifest.omissions.push({ attachmentId: f.id, locator: source, reason });
      };
      if (!['usable', 'partial'].includes(f.processing_status)) {
        omit('processing_failed');
        continue;
      }
      const derivatives = await this.db.getRepository(AssistantAttachmentDerivative).find({
        where: { attachment_id: f.id, processing_version: f.processing_version },
        order: { part_index: 'ASC' },
      });
      const remainingNew = Math.max(1, newCount - i);
      const share = Math.min(
        8000,
        Math.floor(attachmentBudget / (i < newCount ? remainingNew : 1))
      );
      let used = 0;
      let excluded = false;
      if (f.category === 'image') {
        const d = derivatives.find((d) => d.kind === 'image');
        if (!d) {
          omit('source_unavailable');
          continue;
        }
        if (
          images.length >= C.maxImages ||
          profile.imageTokenUpperBound > attachmentBudget ||
          (i >= newCount && profile.imageTokenUpperBound > share)
        ) {
          omit('context_budget');
          continue;
        }
        if (
          !['image/jpeg', 'image/png'].includes(d.media_type) ||
          Number(d.byte_size) > C.maxImageBytes ||
          !Number.isInteger(d.metadata.width) ||
          !Number.isInteger(d.metadata.height) ||
          Number(d.metadata.width) > 2048 ||
          Number(d.metadata.height) > 2048 ||
          Number(d.metadata.width) < 1 ||
          Number(d.metadata.height) < 1
        )
          throw attachmentError('ATTACHMENT_PROCESSING_LIMIT', 422);
        const bytes = await this.storage.read(d.storage_key, C.maxImageBytes);
        images.push({
          type: 'image',
          attachmentId: f.id,
          mediaType: d.media_type as 'image/jpeg' | 'image/png',
          base64: bytes.toString('base64'),
        });
        const source: AttachmentSourceLocator = { kind: 'image', frame: 1 };
        const record = {
          attachmentId: f.id,
          filename: f.original_filename,
          locator: source,
          imageOrdinal: images.length,
        };
        used += profile.imageTokenUpperBound + Buffer.byteLength(quote(record));
        imageTokens += profile.imageTokenUpperBound;
        records.push(record);
        usage.included.push(source);
      } else {
        for (const d of derivatives.filter((d) => d.kind === 'text')) {
          const bytes = await this.storage.read(d.storage_key, 2_097_152);
          let segments: unknown;
          try {
            segments = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
          } catch {
            throw attachmentError('ATTACHMENT_PROCESSING_FAILED', 422);
          }
          if (!Array.isArray(segments)) throw attachmentError('ATTACHMENT_PROCESSING_FAILED', 422);
          for (const s of segments as Array<{ locator?: unknown; text?: unknown }>) {
            if (!locator(s.locator) || typeof s.text !== 'string' || !s.text.isWellFormed())
              throw attachmentError('ATTACHMENT_PROCESSING_FAILED', 422);
            const record = {
              attachmentId: f.id,
              filename: f.original_filename,
              locator: s.locator,
              text: s.text,
            };
            const n = Buffer.byteLength(quote(record)) + 1;
            if (used + n <= share && s.text.trim()) {
              records.push(record);
              usage.included.push(s.locator);
              used += n;
            } else {
              omit('context_budget', s.locator);
              excluded = true;
            }
          }
        }
      }
      attachmentBudget -= used;
      if (usage.included.length) {
        usage.status = excluded || f.processing_status === 'partial' ? 'partial' : 'included';
        manifest.selectedAttachmentIds.push(f.id);
      } else if (!excluded) omit('source_unavailable');
      for (const omission of f.coverage?.omitted ?? [])
        manifest.omissions.push({ ...omission, attachmentId: f.id });
    }
    if (!manifest.selectedAttachmentIds.length)
      throw attachmentError('ATTACHMENT_EMPTY_CONTENT', 422);
    manifest.truncated = manifest.omissions.length > 0;
    const envelope = quote({
      protocolVersion: ATTACHMENT_PROTOCOL,
      quotedHistory: history,
      quotedAttachments: records,
      omissions: manifest.omissions,
      currentInstruction: current.content,
    });
    const messages: AgentChatMessage[] = [
      { role: 'system', content: ATTACHMENT_SYSTEM_POLICY },
      { role: 'user', content: [{ type: 'text', text: envelope }, ...images] },
    ];
    // UTF-8 bytes are a configured, evidenced conservative tokenizer upper bound; never image bytes.
    const supplied =
      Buffer.byteLength(ATTACHMENT_SYSTEM_POLICY) + Buffer.byteLength(envelope) + imageTokens;
    if (supplied > C.maxSuppliedInputTokens)
      throw attachmentError('ATTACHMENTS_CONTEXT_LIMIT', 422);
    const body = serializeAttachmentRequest(profile.model, messages);
    manifest.accounting = {
      ...manifest.accounting,
      suppliedInputTokens: supplied,
      imageTokens,
      serializedRequestBytes: Buffer.byteLength(body),
      combinedTextUtf16Units: ATTACHMENT_SYSTEM_POLICY.length + envelope.length,
    };
    return { messages, manifest };
  }
}
