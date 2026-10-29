import { SendMessageDto } from './dto/send-message.dto';
import { validateAttachmentSubmission } from './attachment-submissions.service';
import { HttpException } from '@nestjs/common';

function dto(base: Partial<SendMessageDto> & { message?: string }): () => unknown {
  const payload = new SendMessageDto();
  Object.assign(payload, {
    message: base.message ?? 'Revisa los archivos',
    channel: base.channel ?? 'web',
  });
  Object.assign(payload, base);
  return () => validateAttachmentSubmission(payload);
}

function expectCode(fn: () => unknown, code: string, status = 400): void {
  let err: unknown;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(HttpException);
  expect((err as HttpException).getResponse()).toMatchObject({ code });
  expect((err as HttpException).getStatus()).toBe(status);
}

const UUID = '00000000-0000-4000-8000-000000000001';

describe('validateAttachmentSubmission', () => {
  it('accepts plain and attachment messages with an exact ordered ready set', () => {
    expect(dto({})).not.toThrow();
    expect(
      dto({
        uploadBatchId: UUID,
        clientMessageId: '00000000-0000-4000-8000-000000000002',
        attachmentIds: [UUID],
      })
    ).not.toThrow();
    expect(
      dto({
        uploadBatchId: UUID,
        clientMessageId: '00000000-0000-4000-8000-000000000002',
        attachmentIds: [UUID, '11111111-1111-4111-8111-111111111111'],
      })
    ).not.toThrow();
  });

  it('accepts only nonempty instructions under the 4000 character bound', () => {
    expectCode(dto({ message: '   ' }), 'ATTACHMENT_SELECTION_MISMATCH');
    expectCode(dto({ message: 'x'.repeat(4001) }), 'ATTACHMENT_SELECTION_MISMATCH');
    expectCode(dto({ message: 'lone\u{d800}' }), 'ATTACHMENT_SELECTION_MISMATCH');
  });

  it('rejects partial attachment fields', () => {
    expectCode(dto({ uploadBatchId: UUID }), 'ATTACHMENT_SELECTION_MISMATCH');
    expectCode(dto({ attachmentIds: [UUID] }), 'ATTACHMENT_SELECTION_MISMATCH');
    expect(
      dto({ message: 'hola', clientMessageId: '00000000-0000-4000-8000-000000000002' })
    ).not.toThrow();
    expectCode(
      dto({ uploadBatchId: UUID, clientMessageId: UUID, attachmentIds: [] }),
      'ATTACHMENT_SELECTION_MISMATCH'
    );
    expectCode(
      dto({ uploadBatchId: 'not-uuid', clientMessageId: UUID, attachmentIds: [UUID] }),
      'ATTACHMENT_SELECTION_MISMATCH'
    );
    expectCode(
      dto({ uploadBatchId: UUID, clientMessageId: 'no-uuid', attachmentIds: [UUID] }),
      'ATTACHMENT_SELECTION_MISMATCH'
    );
  });

  it('rejects five-plus, duplicated or malformed attachment ids', () => {
    const ids = [...Array(6)].map((_, index) => `00000000-0000-4000-8000-00000000000${index}`);
    expectCode(
      dto({
        uploadBatchId: UUID,
        clientMessageId: UUID,
        attachmentIds: ids,
      }),
      'ATTACHMENT_SELECTION_MISMATCH'
    );
    expectCode(
      dto({ uploadBatchId: UUID, clientMessageId: UUID, attachmentIds: [UUID, UUID] }),
      'ATTACHMENT_SELECTION_MISMATCH'
    );
    expectCode(
      dto({ uploadBatchId: UUID, clientMessageId: UUID, attachmentIds: ['nope'] }),
      'ATTACHMENT_SELECTION_MISMATCH'
    );
  });

  it('accepts equal session aliases and rejects conflicts', () => {
    expect(dto({ sessionId: UUID, conversationId: UUID })).not.toThrow();
    expectCode(
      dto({
        sessionId: '99999999-9999-4999-8999-999999999999',
        conversationId: UUID,
      }),
      'ATTACHMENT_SELECTION_MISMATCH'
    );
  });
});
