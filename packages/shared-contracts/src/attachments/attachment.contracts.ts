import type { AgentProviderType } from '../agents/agent.contracts';

export type AssistantAttachmentChannel = 'web' | 'mobile';

/** Inclusive original-file limits, independent of processing/model limits. */
export interface AttachmentPolicy {
  maxFiles: number;
  maxFileBytes: number;
  maxBatchBytes: number;
  maxFilenameBytes: number;
}

export const ASSISTANT_ATTACHMENT_POLICY = {
  maxFiles: 5,
  maxFileBytes: 20_971_520,
  maxBatchBytes: 104_857_600,
  maxFilenameBytes: 255,
} as const satisfies AttachmentPolicy;

/** Backend guards, not guarantees about runtime generation, context, compute or cost. */
export const ASSISTANT_ATTACHMENT_CONSTRAINTS = {
  maxSerializedRequestBytes: 9_000_000,
  maxCombinedTextUtf16Units: 60_000,
  maxSuppliedInputTokens: 24_000,
  maxOutputTokens: 4_096,
  maxOutputUtf16Units: 16_000,
  maxRawResponseBytes: 262_144,
  invocationDeadlineMs: 120_000,
  maxImages: 5,
  maxImageBytes: 1_048_576,
  maxImageLongEdgePixels: 2_048,
} as const;

/** Batch state is separate from each file's lifecycle and processing outcome. */
export type AssistantUploadBatchState = 'open' | 'consumed' | 'cancelled' | 'expired';
export type AttachmentLifecycle = 'uploading' | 'ready' | 'attached' | 'deleting' | 'expired';
export type AttachmentProcessingStatus = 'pending' | 'processing' | 'usable' | 'partial' | 'failed';
export type AttachmentCategory = 'document' | 'image' | 'spreadsheet' | 'text' | 'log' | 'source';
export type AttachmentImageMediaType = 'image/jpeg' | 'image/png';

/** Stable, sanitized codes; never forward parser/provider exception text. */
export type AttachmentErrorCode =
  | 'ATTACHMENT_COUNT_EXCEEDED'
  | 'ATTACHMENT_TOO_LARGE'
  | 'ATTACHMENT_BATCH_TOO_LARGE'
  | 'ATTACHMENT_INVALID_FILENAME'
  | 'ATTACHMENT_UNSUPPORTED_CONTENT'
  | 'ATTACHMENT_CORRUPT'
  | 'ATTACHMENT_PASSWORD_PROTECTED'
  | 'ATTACHMENT_DECODING_FAILED'
  | 'ATTACHMENT_EMPTY_CONTENT'
  | 'ATTACHMENT_OCR_FAILED'
  | 'ATTACHMENT_CONVERSION_FAILED'
  | 'ATTACHMENT_CODEC_UNAVAILABLE'
  | 'ATTACHMENT_PROCESSING_LIMIT'
  | 'ATTACHMENT_PROCESSING_TIMEOUT'
  | 'ATTACHMENT_PROCESSING_FAILED'
  | 'ATTACHMENT_UPLOAD_FAILED'
  | 'ATTACHMENT_STORAGE_UNAVAILABLE'
  | 'ATTACHMENT_ORIGINAL_UNAVAILABLE'
  | 'ATTACHMENT_THUMBNAIL_UNAVAILABLE'
  | 'ATTACHMENT_NOT_READY'
  | 'ATTACHMENT_BATCH_UNAVAILABLE'
  | 'ATTACHMENT_SELECTION_MISMATCH'
  | 'ATTACHMENT_IDEMPOTENCY_CONFLICT'
  | 'ATTACHMENT_ACCESS_REVOKED'
  | 'ATTACHMENT_CAPACITY_UNAVAILABLE'
  | 'ATTACHMENTS_UNSUPPORTED_PROVIDER'
  | 'ATTACHMENTS_CAPABILITY_UNAVAILABLE'
  | 'ATTACHMENTS_PROVIDER_FAILED'
  | 'ATTACHMENTS_DISPATCH_INDETERMINATE'
  | 'ATTACHMENTS_CONTEXT_LIMIT'
  | 'ATTACHMENTS_RESPONSE_INVALID'
  | 'ATTACHMENTS_RESPONSE_TOO_LARGE';

export interface AssistantAttachmentErrorDto {
  code: AttachmentErrorCode;
  message: string;
  retryable: boolean;
  attachmentId?: string;
  clientFileId?: string;
  taskId?: string;
  sessionId?: string;
}

/** One-based inclusive coordinates; page regions use normalized [0, 1] bounds. */
export type AttachmentSourceLocator =
  | {
      kind: 'pages';
      start: number;
      end: number;
      region?: { x: number; y: number; width: number; height: number };
    }
  | { kind: 'lines'; start: number; end: number }
  | {
      kind: 'sheet';
      sheet: string;
      startRow: number;
      endRow: number;
      startColumn?: number;
      endColumn?: number;
      hidden?: boolean;
    }
  | { kind: 'document'; section: string; start: number; end: number }
  | { kind: 'image'; frame: number };

export type AttachmentCoverageReason =
  | 'processing_limit'
  | 'processing_failed'
  | 'processing_timeout'
  | 'empty_content'
  | 'unreadable_content'
  | 'unsupported_content'
  | 'unsupported_encoding'
  | 'unsupported_language'
  | 'ocr_failed'
  | 'conversion_failed'
  | 'context_budget'
  | 'request_byte_limit'
  | 'text_unit_limit'
  | 'history_budget'
  | 'capability_unavailable'
  | 'source_unavailable'
  | 'not_selected'
  | 'unknown_extent'
  | 'additional_frames'
  | 'formula_cache_unavailable';

export interface AttachmentOmissionDto {
  /** Null means the omitted extent could not be determined, not an empty range. */
  locator: AttachmentSourceLocator | null;
  reason: AttachmentCoverageReason;
  message?: string;
}

export interface AttachmentSourceTotalDto {
  unit: 'pages' | 'lines' | 'rows' | 'sections' | 'frames';
  /** Null means unknown; zero means measured empty. */
  total: number | null;
  sheet?: string;
}

/** Extraction coverage only. It does not assert delivery to, or attention by, a model. */
export interface AttachmentCoverageDto {
  attachmentId: string;
  processingVersion: number;
  status: AttachmentProcessingStatus;
  /** Safe explanation, not extracted text or a generated summary of unread content. */
  summary: string;
  totals: AttachmentSourceTotalDto[];
  included: AttachmentSourceLocator[];
  omitted: AttachmentOmissionDto[];
  truncated: boolean;
  extractedTextBytes?: number;
  notices?: Array<{
    code: 'image_downscaled' | 'primary_frame_only' | 'tone_mapped' | 'parse_warning';
    message: string;
  }>;
}

/** Owner-scoped metadata only: no owner id, storage key, hash, URL or raw content. */
export interface AssistantAttachmentDto {
  id: string;
  batchId: string;
  sessionId: string | null;
  messageId: string | null;
  clientFileId: string;
  /** Safe original basename, at most 255 UTF-8 bytes; reject paths/control characters. */
  originalFilename: string;
  /** Actual original bytes; zero-byte originals remain eligible for an empty-content outcome. */
  byteSize: number;
  /** Null until initial classification has completed. */
  mediaType: string | null;
  category: AttachmentCategory | null;
  lifecycle: AttachmentLifecycle;
  processingStatus: AttachmentProcessingStatus;
  processingVersion: number;
  errorCode: AttachmentErrorCode | null;
  errorMessage: string | null;
  suggestedAction?: string;
  downloadAvailable: boolean;
  thumbnailAvailable: boolean;
  coverage?: AttachmentCoverageDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssistantUploadBatchCommand {
  /** UUID idempotency key, scoped to the authenticated owner. */
  clientBatchId: string;
  /** Omit for a new-session draft; reservation does not create a session. */
  sessionId?: string;
  channel: AssistantAttachmentChannel;
}

/** Multipart metadata accompanying exactly one `file`; it is not a JSON file payload. */
export interface UploadAssistantAttachmentCommand {
  /** UUID; replay in the same batch returns the descriptor, conflicting bytes yield 409. */
  clientFileId: string;
}

export interface AssistantAttachmentConstraintsDto {
  maxSerializedRequestBytes: number;
  maxCombinedTextUtf16Units: number;
  maxSuppliedInputTokens: number;
  maxOutputTokens: number;
  maxOutputUtf16Units: number;
  maxRawResponseBytes: number;
  invocationDeadlineMs: number;
  maxImages: number;
  maxImageBytes: number;
  maxImageLongEdgePixels: number;
}

export type AttachmentCapabilityUnavailableReason =
  | 'unsupported_provider'
  | 'profile_unverified'
  | 'model_identity_unverified'
  | 'text_accounting_unavailable'
  | 'image_input_unverified'
  | 'image_accounting_unavailable'
  | 'policy_validation_pending'
  | 'privacy_validation_pending'
  | 'worker_unavailable'
  | 'storage_unavailable'
  | 'deployment_validation_pending';

export type AssistantInputAccountingMode = 'verified_tokenizer' | 'conservative_estimate' | 'unavailable';
export type AssistantOutputAccountingMode = 'verified_tokenizer' | 'utf16_units';

/** Sanitized projection of the resolved backend-private profile, never generic discovery. */
export interface AssistantAttachmentCapabilitiesDto {
  provider: AgentProviderType;
  resolvedModel: string | null;
  profileVersion: string | null;
  evidenceVersion: string | null;
  modelIdentityEvidence: 'unknown' | 'configured' | 'verified';
  /** True only when this live profile satisfies all required activation checks. */
  available: boolean;
  imageInputAvailable: boolean;
  unavailableReasons: AttachmentCapabilityUnavailableReason[];
  textInputAccounting: AssistantInputAccountingMode;
  imageInputAccounting: 'verified_upper_bound' | 'unavailable';
  imageTokenUpperBound?: number;
  outputAccountingMode: AssistantOutputAccountingMode;
  /** Null means unknown, not an assertion of total runtime context control. */
  contextWindowTokens: number | null;
  imageTransport: 'inline-data-url' | null;
  imageMediaTypes: AttachmentImageMediaType[];
  limits: AttachmentPolicy;
  /** Effective bounds (including any evidenced lower deployment bound). */
  constraints: AssistantAttachmentConstraintsDto;
}

export interface AssistantUploadBatchDto {
  id: string;
  sessionId: string | null;
  channel: AssistantAttachmentChannel;
  state: AssistantUploadBatchState;
  /** ISO-8601; fixed 24 hours from creation, not a sliding expiry. */
  expiresAt: string;
  attachments: AssistantAttachmentDto[];
  limits: AttachmentPolicy;
  capabilities: AssistantAttachmentCapabilitiesDto;
}

export interface AssistantOutputAccountingDto {
  mode: AssistantOutputAccountingMode;
  /** Units are tokens only in verified_tokenizer mode; otherwise UTF-16 code units. */
  limit: number;
  returnedUnits: number;
  tokenizerId?: string;
  evidenceVersion?: string;
}

/** Persist these same fields in sync results, task polling and message history. */
export interface AssistantOutputMetadata {
  /** Absent on legacy rows means no recorded guard result, not verified completeness. */
  partialOutput?: boolean;
  /** Required with partialOutput=true; never use for invalid raw JSON fragments. */
  partialOutputReason?: 'output_token_limit' | 'output_text_limit';
  partialOutputNotice?: string;
  outputAccounting?: AssistantOutputAccountingDto;
}

export interface AttachmentContextFileDto {
  attachmentId: string;
  processingVersion: number;
  status: 'included' | 'partial' | 'excluded';
  included: AttachmentSourceLocator[];
}

export interface AssistantContextOmissionDto extends AttachmentOmissionDto {
  /** Null for history/policy omissions unrelated to a particular file. */
  attachmentId: string | null;
  messageId?: string;
}

export interface AssistantContextAccountingDto {
  textMode: AssistantInputAccountingMode;
  imageMode: 'verified_upper_bound' | 'unavailable';
  /** Counts only Kyrae-supplied input, never the complete internal runtime prompt. */
  suppliedInputTokens: number | null;
  imageTokens: number | null;
  serializedRequestBytes: number | null;
  combinedTextUtf16Units: number | null;
  tokenizerId?: string;
  evidenceVersion?: string;
}

/** Persisted per-invocation truth; delivered is not proof of model attention or full analysis. */
export interface AssistantContextManifestDto {
  version: number;
  protocolVersion: string;
  profileVersion: string;
  provider: AgentProviderType;
  resolvedModel: string;
  /** indeterminate must never trigger automatic provider redispatch. */
  status: 'prepared' | 'delivered' | 'provider_failed' | 'indeterminate';
  cutoffMessageId: string;
  files: AttachmentContextFileDto[];
  /** Actual selected file order, including rehydrated earlier sources when used. */
  selectedAttachmentIds: string[];
  includedHistoryMessageIds: string[];
  omittedHistoryMessageIds: string[];
  omissions: AssistantContextOmissionDto[];
  truncated: boolean;
  budget: AssistantAttachmentConstraintsDto;
  accounting: AssistantContextAccountingDto;
  createdAt: string;
}
