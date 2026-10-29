import { ASSISTANT_ATTACHMENT_POLICY } from '@kyrae/shared-contracts';
import type { AssistantAttachmentDto } from '@kyrae/shared-contracts';
export type * from '@kyrae/shared-contracts';

export interface StagedAttachment {
  clientFileId: string;
  file: File;
  state: 'queued' | 'uploading' | 'ready' | 'failed' | 'deleting';
  progress: number | null;
  descriptor?: AssistantAttachmentDto;
  error?: string;
}

export function validateAttachmentSelection(files: File[], existing: File[]): string[] {
  const policy = ASSISTANT_ATTACHMENT_POLICY;
  const errors: string[] = [];
  if (files.length + existing.length > policy.maxFiles)
    errors.push(
      'Máximo 5 archivos por mensaje. No se agregó esta selección; elige hasta 5 archivos en total.'
    );
  for (const file of files) {
    if (file.size > policy.maxFileBytes)
      errors.push(`${file.name}: supera 20 MiB (20.971.520 bytes).`);
    if (
      !file.name ||
      new TextEncoder().encode(file.name).length > policy.maxFilenameBytes ||
      /[/\\]/.test(file.name) ||
      [...file.name].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
    )
      errors.push(
        `${file.name}: nombre inválido; máximo 255 bytes UTF-8, sin rutas ni caracteres de control.`
      );
    if (file.name === '.env')
      errors.push('.env: utiliza un archivo de ejemplo sin secretos (.env.example).');
  }
  return errors;
}
