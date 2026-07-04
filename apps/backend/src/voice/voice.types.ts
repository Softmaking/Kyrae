export interface UploadedVoiceFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface VoiceTranscriptionResult {
  transcript: string;
  language: string | null;
  confidence: number | null;
  provider: string;
  metadata: Record<string, unknown> | null;
}
