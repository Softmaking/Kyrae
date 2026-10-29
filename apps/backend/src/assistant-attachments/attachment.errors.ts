import { HttpException } from '@nestjs/common';
import type { AttachmentErrorCode } from '@kyrae/shared-contracts';

export function attachmentError(
  code: AttachmentErrorCode,
  status = 409,
  retryable = false
): HttpException {
  return new HttpException(
    {
      code,
      message:
        'No se pudo completar la operación con los archivos. Conserva los originales y vuelve a consultar el estado o intenta con un nuevo envío.',
      retryable,
    },
    status
  );
}
