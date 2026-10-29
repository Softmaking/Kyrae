import type { AttachmentCategory } from '@kyrae/shared-contracts';
import { attachmentError } from './attachment.errors';

export function hasRestrictedControlChar(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 9 || c === 11 || c === 12 || (c >= 14 && c < 32)) return true;
  }
  return false;
}

export function validateOriginalFilename(name: string): void {
  if (!name || name === '.' || name === '..' || name.includes('\\') || name.includes('/'))
    throw attachmentError('ATTACHMENT_INVALID_FILENAME', 400);
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    if (c < 32 || c === 127) throw attachmentError('ATTACHMENT_INVALID_FILENAME', 400);
  }
  if (Buffer.byteLength(name) > 255 || !name.isWellFormed())
    throw attachmentError('ATTACHMENT_INVALID_FILENAME', 400);
}

export function classifyOriginal(
  name: string,
  bytes: Buffer,
  complete: boolean
): { mediaType: string; category: AttachmentCategory } {
  validateOriginalFilename(name);
  const lower = name.toLowerCase();
  const ext = lower.split('.').at(-1) ?? '';
  const starts = (s: string) => bytes.subarray(0, s.length).toString('latin1') === s;
  const image = (mediaType: string) => ({ mediaType, category: 'image' as const });
  if (['jpg', 'jpeg'].includes(ext) && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return image('image/jpeg');
  if (ext === 'png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return image('image/png');
  if (ext === 'webp' && starts('RIFF') && bytes.subarray(8, 12).toString() === 'WEBP')
    return image('image/webp');
  if (
    ['heic', 'heif'].includes(ext) &&
    bytes.subarray(4, 8).toString() === 'ftyp' &&
    /heic|heix|hevc|hevx|mif1|msf1/.test(bytes.subarray(8, 64).toString('latin1'))
  )
    return image(ext === 'heic' ? 'image/heic' : 'image/heif');
  if (ext === 'pdf' && starts('%PDF-'))
    return { mediaType: 'application/pdf', category: 'document' };
  if (['docx', 'xlsx'].includes(ext) && starts('PK\x03\x04'))
    return {
      mediaType:
        ext === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      category: ext === 'docx' ? 'document' : 'spreadsheet',
    };
  if (
    ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'pdf', 'docx', 'xlsx'].includes(ext) ||
    lower === '.env' ||
    lower.endsWith('.env')
  )
    throw attachmentError('ATTACHMENT_UNSUPPORTED_CONTENT', 415);
  let text: string;
  try {
    const encoding =
      bytes[0] === 255 && bytes[1] === 254
        ? 'utf-16le'
        : bytes[0] === 254 && bytes[1] === 255
          ? 'utf-16be'
          : 'utf-8';
    text = new TextDecoder(encoding, { fatal: true }).decode(bytes, { stream: !complete });
    if (hasRestrictedControlChar(text)) throw new Error();
  } catch {
    throw attachmentError('ATTACHMENT_DECODING_FAILED', 415);
  }
  const config =
    /(^|\.)env\.example$/.test(lower) ||
    ['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'csv', 'tsv'].includes(ext);
  const log = /\.(log|out|err)([.\d_-].*)?$/.test(lower);
  const source =
    [
      'js',
      'jsx',
      'ts',
      'tsx',
      'mjs',
      'cjs',
      'py',
      'dart',
      'java',
      'kt',
      'kts',
      'swift',
      'c',
      'h',
      'cpp',
      'hpp',
      'cs',
      'go',
      'rs',
      'rb',
      'php',
      'sh',
      'bash',
      'zsh',
      'ps1',
      'sql',
      'html',
      'css',
      'scss',
      'vue',
      'svelte',
      'r',
      'lua',
      'pl',
      'ex',
      'exs',
      'erl',
      'scala',
      'groovy',
      'gradle',
      'bat',
      'cmd',
      'proto',
      'graphql',
      'gql',
      'ipynb',
    ].includes(ext) ||
    ['dockerfile', 'makefile', 'jenkinsfile'].includes(lower) ||
    text.startsWith('#!');
  if (!config && !log && !source) throw attachmentError('ATTACHMENT_UNSUPPORTED_CONTENT', 415);
  return {
    mediaType:
      ext === 'csv' ? 'text/csv' : ext === 'tsv' ? 'text/tab-separated-values' : 'text/plain',
    category: log
      ? 'log'
      : source
        ? 'source'
        : ['csv', 'tsv'].includes(ext)
          ? 'spreadsheet'
          : 'text',
  };
}
