import { HttpException } from '@nestjs/common';
import {
  classifyOriginal,
  hasRestrictedControlChar,
  validateOriginalFilename,
} from './attachment-classification';

function expectCode(fn: () => unknown, code: string, status?: number): void {
  let err: unknown;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(HttpException);
  const http = err as HttpException;
  const response = http.getResponse() as { code?: string };
  expect(response.code).toBe(code);
  if (status !== undefined) expect(http.getStatus()).toBe(status);
}

const PNG = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  Buffer.from('\r\nIHDR\x00\x00\x00\x01'),
  Buffer.from('canary canary canary does node fake png'),
]);

const JPEG = Buffer.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70]);

const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([20, 0, 0, 0]),
  Buffer.from('WEBPV8P '),
]);

const ftyp = (brand: string): Buffer => {
  const box = Buffer.alloc(64);
  Buffer.from('ftyp').copy(box, 4);
  Buffer.from(brand).copy(box, 8);
  return box;
};

describe('hasRestrictedControlChar', () => {
  it('allows horizontal tab, line feed and carriage return', () => {
    expect(hasRestrictedControlChar('a\tb\nc\rd')).toBe(false);
    expect(hasRestrictedControlChar('normal text 0x20, json: {"k": 1}')).toBe(false);
  });

  it('rejects all other control characters', () => {
    expect(hasRestrictedControlChar('\x00')).toBe(true);
    expect(hasRestrictedControlChar('a\x08b')).toBe(true);
    expect(hasRestrictedControlChar('\x0b')).toBe(true);
    expect(hasRestrictedControlChar('\x0c')).toBe(true);
    expect(hasRestrictedControlChar('\x0e')).toBe(true);
    expect(hasRestrictedControlChar('\x1f')).toBe(true);
  });
});

describe('validateOriginalFilename', () => {
  it('accepts ordinary names up to 255 UTF-8 bytes', () => {
    expect(() => validateOriginalFilename('IMG_4251.HEIC')).not.toThrow();
    expect(() => validateOriginalFilename(`${'\u00e9'.repeat(85)}.txt`)).not.toThrow();
  });

  it('rejects traversal separators and dot entries', () => {
    expectCode(() => validateOriginalFilename('a/b.txt'), 'ATTACHMENT_INVALID_FILENAME', 400);
    expectCode(() => validateOriginalFilename('a\\b.txt'), 'ATTACHMENT_INVALID_FILENAME', 400);
    expectCode(() => validateOriginalFilename('..'), 'ATTACHMENT_INVALID_FILENAME', 400);
  });

  it('rejects control characters, oversized names and lone surrogates', () => {
    expectCode(() => validateOriginalFilename('a\x00b'), 'ATTACHMENT_INVALID_FILENAME', 400);
    expectCode(() => validateOriginalFilename('\x1fb'), 'ATTACHMENT_INVALID_FILENAME', 400);
    expectCode(() => validateOriginalFilename('\x7fb'), 'ATTACHMENT_INVALID_FILENAME', 400);
    expectCode(
      () => validateOriginalFilename(`\u00e9${'\u00e9'.repeat(128)}.txt`),
      'ATTACHMENT_INVALID_FILENAME',
      400
    );
    expectCode(() => validateOriginalFilename('lone\u{d800}'), 'ATTACHMENT_INVALID_FILENAME', 400);
  });
});

describe('classifyOriginal', () => {
  it('recognizes images by signature', () => {
    expect(classifyOriginal('photo.png', PNG, true)).toEqual({
      mediaType: 'image/png',
      category: 'image',
    });
    expect(classifyOriginal('photo.jpg', JPEG, true)).toEqual({
      mediaType: 'image/jpeg',
      category: 'image',
    });
    expect(classifyOriginal('riff.webp', WEBP, true)).toEqual({
      mediaType: 'image/webp',
      category: 'image',
    });
    expect(classifyOriginal('IMG_4251.HEIC', ftyp('heic'), true)).toEqual({
      mediaType: 'image/heic',
      category: 'image',
    });
    expect(classifyOriginal('sample.heif', ftyp('mif1'), true)).toEqual({
      mediaType: 'image/heif',
      category: 'image',
    });
    expect(classifyOriginal('mobile.heic', ftyp('msf1'), true)).toEqual({
      mediaType: 'image/heic',
      category: 'image',
    });
  });

  it('rejects supported extensions with mismatched signatures', () => {
    expectCode(() => classifyOriginal('doc.jpg', PNG, true), 'ATTACHMENT_UNSUPPORTED_CONTENT', 415);
    expectCode(
      () => classifyOriginal('doc.png', JPEG, true),
      'ATTACHMENT_UNSUPPORTED_CONTENT',
      415
    );
    expectCode(
      () => classifyOriginal('doc.webp', Buffer.from('WEBPbody'), false),
      'ATTACHMENT_UNSUPPORTED_CONTENT',
      415
    );
    expectCode(
      () => classifyOriginal('doc.heic', PNG, true),
      'ATTACHMENT_UNSUPPORTED_CONTENT',
      415
    );
    expectCode(
      () => classifyOriginal('doc.docx', Buffer.from('PK\x02\x03'), true),
      'ATTACHMENT_UNSUPPORTED_CONTENT',
      415
    );
    expectCode(
      () => classifyOriginal('doc.pdf', Buffer.from('not a pdf'), true),
      'ATTACHMENT_UNSUPPORTED_CONTENT',
      415
    );
  });

  it('recognizes OOXML and PDF documents', () => {
    const zip = Buffer.from('PK\x03\x04');
    expect(classifyOriginal('memo.pdf', Buffer.from('%PDF-1.7'), true)).toEqual({
      mediaType: 'application/pdf',
      category: 'document',
    });
    expect(classifyOriginal('memo.docx', zip, true)).toEqual({
      mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      category: 'document',
    });
    expect(classifyOriginal('table.xlsx', zip, true)).toEqual({
      mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      category: 'spreadsheet',
    });
  });

  it('accepts .env.example but rejects .env based names', () => {
    expect(classifyOriginal('app.env.example', Buffer.from('KEY=value'), true)).toEqual({
      mediaType: 'text/plain',
      category: 'text',
    });
    expectCode(
      () => classifyOriginal('.env', Buffer.from('KEY=value'), true),
      'ATTACHMENT_UNSUPPORTED_CONTENT',
      415
    );
    expectCode(
      () => classifyOriginal('notes.env', Buffer.from('KEY=value'), true),
      'ATTACHMENT_UNSUPPORTED_CONTENT',
      415
    );
  });

  it('classifies plain, delimited, log and source text', () => {
    expect(classifyOriginal('notes.txt', Buffer.from('hola'), true)).toEqual({
      mediaType: 'text/plain',
      category: 'text',
    });
    expect(classifyOriginal('data.csv', Buffer.from('a,b\r\n1,2'), true)).toEqual({
      mediaType: 'text/csv',
      category: 'spreadsheet',
    });
    expect(classifyOriginal('data.tsv', Buffer.from('a\tb'), true)).toEqual({
      mediaType: 'text/tab-separated-values',
      category: 'spreadsheet',
    });
    expect(classifyOriginal('server.log', Buffer.from('started'), true)).toEqual({
      mediaType: 'text/plain',
      category: 'log',
    });
    expect(classifyOriginal('server.err.2', Buffer.from('boom'), true)).toEqual({
      mediaType: 'text/plain',
      category: 'log',
    });
    expect(classifyOriginal('main.ts', Buffer.from('export const a = 1;'), true)).toEqual({
      mediaType: 'text/plain',
      category: 'source',
    });
    expect(classifyOriginal('Dockerfile', Buffer.from('FROM node'), true)).toEqual({
      mediaType: 'text/plain',
      category: 'source',
    });
    expect(classifyOriginal('run.sh', Buffer.from('ls /dir/file.txt without shell'), true)).toEqual(
      {
        mediaType: 'text/plain',
        category: 'source',
      }
    );
    expect(classifyOriginal('noext', Buffer.from('#!/bin/sh\nls'), true)).toEqual({
      mediaType: 'text/plain',
      category: 'source',
    });
  });

  it('decodes UTF-16LE BOM text', () => {
    const bytes = Buffer.concat([Buffer.from([255, 254]), Buffer.from('hola\u00e9', 'utf16le')]);
    expect(classifyOriginal('unicode.txt', bytes, true)).toEqual({
      mediaType: 'text/plain',
      category: 'text',
    });
  });

  it('rejects text with embedded control bytes and invalid encodings', () => {
    expectCode(
      () => classifyOriginal('bad.txt', Buffer.from('a\x00b'), true),
      'ATTACHMENT_DECODING_FAILED',
      415
    );
    expectCode(
      () => classifyOriginal('bad.txt', Buffer.from('a\xff b', 'latin1'), true),
      'ATTACHMENT_DECODING_FAILED',
      415
    );
  });

  it('rejects unknown extensions with plain decoded text', () => {
    expectCode(
      () => classifyOriginal('data.bin', Buffer.from('plain'), true),
      'ATTACHMENT_UNSUPPORTED_CONTENT',
      415
    );
    expectCode(
      () => classifyOriginal('noext', Buffer.from('plain'), true),
      'ATTACHMENT_UNSUPPORTED_CONTENT',
      415
    );
  });
});
