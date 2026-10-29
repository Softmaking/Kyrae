import { mkdtempSync, realpathSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { FilesystemAttachmentStorage } from './filesystem-attachment-storage.service';

describe('FilesystemAttachmentStorage', () => {
  let root: string;
  let storage: FilesystemAttachmentStorage;

  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'kyrae-attachments-')));
    storage = new FilesystemAttachmentStorage(config(root));
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const KEY = 'bef1d1b0-1111-4222-8333-444455556666';

  it('stores originals with digest, size and 64 KiB prefix, then verifies them', async () => {
    const content = Buffer.from('contenido original canario');
    const stored = await storage.write(sourceOf(content), KEY);
    expect(stored).toEqual({
      key: KEY,
      byteSize: content.length,
      sha256: expect.any(String),
      prefix: content,
    });
    expect(await storage.read(KEY, 1024)).toEqual(content);
    await storage.verify(KEY, content.length, stored.sha256);
  });

  it('rejects oversized streams and cleans the temporary file', async () => {
    await expectAborted(
      storage.write(sourceOf(Buffer.alloc(20_971_521, 1)), KEY),
      'ATTACHMENT_TOO_LARGE'
    );
    expect([...(await orphansAt(storage, new Date(Date.now() - 60_000)))]).toEqual([]);
  });

  it('rejects invalid keys and duplicated writes', async () => {
    await expectAborted(
      storage.write(sourceOf(Buffer.from('x')), 'not-a-uuid'),
      'ATTACHMENT_STORAGE_UNAVAILABLE'
    );
    await storage.write(sourceOf(Buffer.from('x')), KEY);
    await expect(storage.write(sourceOf(Buffer.from('x')), KEY)).rejects.toThrow();
  });

  it('rejects relative storage roots', async () => {
    const relative = new FilesystemAttachmentStorage(config('relative/attachments'));
    await expectAborted(
      relative.write(sourceOf(Buffer.from('x')), KEY),
      'ATTACHMENT_STORAGE_UNAVAILABLE'
    );
  });

  it('marks digest mismatch and size drift as original unavailability', async () => {
    const stored = await storage.write(sourceOf(Buffer.from('data')), KEY);
    await expectAborted(
      storage.verify(KEY, stored.byteSize, '9'.repeat(64)),
      'ATTACHMENT_ORIGINAL_UNAVAILABLE'
    );
    await expectAborted(storage.verify(KEY, 99, stored.sha256), 'ATTACHMENT_ORIGINAL_UNAVAILABLE');
  });

  it('serves read caps and missing originals with explicit codes', async () => {
    await storage.write(sourceOf(Buffer.from('abcdefgh')), KEY);
    await expectAborted(storage.read(KEY, 4), 'ATTACHMENT_PROCESSING_LIMIT');
    await expectAborted(
      storage.read('cafe0000-0000-4000-8000-000000000009', 4),
      'ATTACHMENT_ORIGINAL_UNAVAILABLE'
    );
  });

  it('deletes uploads and lists leftovers only as safe keys', async () => {
    await storage.write(sourceOf(Buffer.from('data')), KEY);
    await storage.delete(KEY);
    await expect(storage.read(KEY, 8)).rejects.toThrow();
    await storage.write(sourceOf(Buffer.from('data')), KEY);
    const past = new Date(Date.now() - 60_000);
    expect([...(await orphansAt(storage, past))]).toEqual([]);
    utimesSync(join(root, KEY), new Date(past.getTime() - 1000), new Date(past.getTime() - 1000));
    expect([...(await orphansAt(storage, past))]).toContain(KEY);
    rmSync(join(root, KEY));
    writeFileSync(join(root, `${KEY}.upload`), 'data');
    expect([...(await orphansAt(storage, new Date(Date.now() + 60_000)))]).toContain(KEY);
  });
});

function config(root: string): ConfigService {
  return {
    get: (key: string) => (key === 'ASSISTANT_ATTACHMENT_STORAGE_ROOT' ? root : undefined),
  } as unknown as ConfigService;
}

async function* sourceOf(content: Buffer): AsyncGenerator<Uint8Array> {
  await Promise.resolve();
  yield content;
}

async function orphansAt(storage: FilesystemAttachmentStorage, cutoff: Date): Promise<Set<string>> {
  const keys = new Set<string>();
  for await (const key of storage.orphans(cutoff)) keys.add(key);
  return keys;
}

async function expectAborted(promise: Promise<unknown>, code: string): Promise<void> {
  let err: unknown;
  try {
    await promise;
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(HttpException);
  expect((err as HttpException).getResponse()).toMatchObject({ code });
  expect(typeof (err as HttpException).getStatus).toBe('function');
}
