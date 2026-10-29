import type { AgentChatMessage, AgentImageContentPart } from '@kyrae/shared-contracts';
import {
  ASSISTANT_ATTACHMENT_CONSTRAINTS,
  ASSISTANT_ATTACHMENT_POLICY,
} from '@kyrae/shared-contracts';
import {
  ATTACHMENT_SYSTEM_POLICY,
  ATTACHMENT_PROTOCOL,
  guardAttachmentAnswer,
  hasTypedParts,
  serializeAttachmentRequest,
} from './attachment-hermes.protocol';

const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(16, 7)]);

const IMAGE_UUID = '00000000-0000-4000-8000-000000000002';

const imagePart = (mediaType: 'image/png' | 'image/jpeg', bytes: Buffer) => ({
  type: 'image' as const,
  attachmentId: IMAGE_UUID,
  mediaType,
  base64: bytes.toString('base64'),
});

const userTurn = (text: string, ...parts: AgentImageContentPart[]): AgentChatMessage => ({
  role: 'user',
  content: [{ type: 'text' as const, text }, ...parts],
});

describe('hasTypedParts', () => {
  it('detects arrays and strings', () => {
    expect(hasTypedParts([{ role: 'user', content: 'hola' }])).toBe(false);
    expect(hasTypedParts([userTurn('mira', imagePart('image/png', PNG))])).toBe(true);
  });
});

describe('serializeAttachmentRequest', () => {
  it('serializes one current turn with a data URL image and no history roles', () => {
    const body = JSON.parse(
      serializeAttachmentRequest('hermes-agent', [
        { role: 'system', content: ATTACHMENT_SYSTEM_POLICY },
        userTurn('Describe la imagen.', imagePart('image/png', PNG)),
      ])
    ) as {
      model: string;
      stream: boolean;
      messages: Array<{ role: string; content: unknown }>;
    };
    expect(body.model).toBe('hermes-agent');
    expect(body.stream).toBe(false);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
    expect(JSON.stringify(body)).toContain(`data:image/png;base64,${PNG.toString('base64')}`);
  });

  it('rejects multi-turn or assistant-including payload shapes', () => {
    expect(() =>
      serializeAttachmentRequest('m', [
        userTurn('a', imagePart('image/png', PNG)),
        userTurn('b', imagePart('image/png', PNG)),
      ])
    ).toThrow();
    expect(() =>
      serializeAttachmentRequest('m', [
        { role: 'assistant', content: 'previo' },
        userTurn('a', imagePart('image/png', PNG)),
      ])
    ).toThrow();
    expect(() => serializeAttachmentRequest('m', [{ role: 'system', content: 's' }])).toThrow();
  });

  it('rejects unsupported media types and fake image signatures', () => {
    const webpPart = {
      type: 'image' as const,
      attachmentId: IMAGE_UUID,
      mediaType: 'image/webp' as never,
      base64: WEBP_BUFFER.toString('base64'),
    };
    expect(() =>
      serializeAttachmentRequest('m', [{ role: 'user', content: [webpPart] }])
    ).toThrow();
    expect(() =>
      serializeAttachmentRequest('m', [
        { role: 'user', content: [imagePart('image/png', Buffer.alloc(10, 0))] },
      ])
    ).toThrow();
    expect(() =>
      serializeAttachmentRequest('m', [{ role: 'user', content: [imagePart('image/jpeg', PNG)] }])
    ).toThrow();
  });

  it('rejects non canonical base64 and fake attachment ids', () => {
    expect(() =>
      serializeAttachmentRequest('m', [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              attachmentId: 'x',
              mediaType: 'image/png',
              base64: PNG.toString('base64'),
            },
          ],
        },
      ])
    ).toThrow();
    expect(() =>
      serializeAttachmentRequest('m', [
        {
          role: 'user',
          content: [{ ...imagePart('image/png', PNG), base64: `${PNG.toString('base64')}us` }],
        },
      ])
    ).toThrow();
  });

  it('rejects oversized images and text unit overflows', () => {
    expect(() =>
      serializeAttachmentRequest('m', [
        { role: 'user', content: [imagePart('image/png', Buffer.alloc(1_048_577, 1))] },
      ])
    ).toThrow();
    expect(() =>
      serializeAttachmentRequest('m', [
        { role: 'user', content: [{ type: 'text', text: 'a'.repeat(60_001) }] },
      ])
    ).toThrow();
    expect(() =>
      serializeAttachmentRequest('m', [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'b'.repeat(30_000) },
            { type: 'text', text: 'c'.repeat(30_001) },
          ],
        },
      ])
    ).toThrow();
  });

  it('rejects malformed text and five images at the byte ceiling still serialize', () => {
    expect(() =>
      serializeAttachmentRequest('m', [
        { role: 'user', content: [{ type: 'text', text: 'lone\u{d800}' }] },
      ])
    ).toThrow();
    const five = [...Array(5)].map(() =>
      imagePart('image/png', Buffer.concat([PNG, Buffer.alloc(1_048_576 - PNG.length, 9)]))
    );
    const body = serializeAttachmentRequest('m', [
      { role: 'user', content: [...five, { type: 'text', text: 'cinco' }] },
    ]);
    expect(Buffer.byteLength(body)).toBeLessThanOrEqual(
      ASSISTANT_ATTACHMENT_CONSTRAINTS.maxSerializedRequestBytes
    );
  });

  it('documents protocol constants for consumers', () => {
    expect(ATTACHMENT_PROTOCOL).toBe('kyrae-attachment-envelope-v1');
    expect(ATTACHMENT_SYSTEM_POLICY).toContain('untrusted source data');
    expect(ASSISTANT_ATTACHMENT_POLICY.maxFiles).toBe(5);
  });
});

describe('guardAttachmentAnswer', () => {
  it('accepts jpeg magic bytes per contract', () => {
    const jpeg = Buffer.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70]);
    const body = JSON.parse(
      serializeAttachmentRequest('m', [{ role: 'user', content: [imagePart('image/jpeg', jpeg)] }])
    ) as { messages: Array<{ content: Array<{ image_url?: { url: string } }> }> };
    expect(body.messages[0].content[0].image_url?.url).toContain('data:image/jpeg;base64,');
  });

  it('passes through short answers with unit accounting', () => {
    expect(guardAttachmentAnswer('Hola')).toEqual({
      message: 'Hola',
      partialOutput: false,
      outputAccounting: { mode: 'utf16_units', limit: 16000, returnedUnits: 4 },
    });
  });

  it('rejects empty or malformed answers and refuses lone surrogates', () => {
    expect(() => guardAttachmentAnswer('')).toThrow();
    expect(() => guardAttachmentAnswer('lone\u{d800}')).toThrow();
  });

  it('truncates long answers at the 16000 unit limit and flags partial output', () => {
    const guarded = guardAttachmentAnswer('a'.repeat(16001));
    expect(guarded.partialOutput).toBe(true);
    expect(guarded.partialOutputReason).toBe('output_text_limit');
    expect(guarded.outputAccounting).toEqual({
      mode: 'utf16_units',
      limit: 16000,
      returnedUnits: 16000,
    });
    expect(guarded.message.length).toBe(16000);
  });

  it('cuts back one unit instead of splitting a surrogate pair at the boundary', () => {
    const guarded = guardAttachmentAnswer(`${'a'.repeat(15999)}\ud83d\ude00`);
    expect(guarded.partialOutput).toBe(true);
    expect(guarded.message.length).toBe(15999);
    expect(guarded.message.charCodeAt(guarded.message.length - 1)).toBe(97);
  });
});

const WEBP_BUFFER = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([20, 0, 0, 0]),
  Buffer.from('WEBPV8P '),
]);
