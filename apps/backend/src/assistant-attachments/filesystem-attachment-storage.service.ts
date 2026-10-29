import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readdir, realpath, unlink } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { isAbsolute, join, parse } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { attachmentError } from './attachment.errors';

export interface StoredOriginal {
  key: string;
  byteSize: number;
  sha256: string;
  prefix: Buffer;
}

@Injectable()
export class FilesystemAttachmentStorage {
  constructor(private readonly config: ConfigService) {}

  private async root(): Promise<string> {
    const root = this.config.get<string>('ASSISTANT_ATTACHMENT_STORAGE_ROOT');
    if (!root || !isAbsolute(root) || root === parse(root).root)
      throw attachmentError('ATTACHMENT_STORAGE_UNAVAILABLE', 503, true);
    // Reject symlinked ancestors too; all keys live directly in this private directory.
    let current = parse(root).root;
    for (const part of root.slice(current.length).split('/').filter(Boolean)) {
      current = join(current, part);
      try {
        await mkdir(current, { mode: 0o700 });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST')
          throw attachmentError('ATTACHMENT_STORAGE_UNAVAILABLE', 503, true);
      }
      const s = await lstat(current);
      if (!s.isDirectory() || s.isSymbolicLink())
        throw attachmentError('ATTACHMENT_STORAGE_UNAVAILABLE', 503);
    }
    if ((await realpath(root)) !== root.replace(/\/$/, ''))
      throw attachmentError('ATTACHMENT_STORAGE_UNAVAILABLE', 503);
    return root;
  }

  private validKey(key: string): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(key))
      throw attachmentError('ATTACHMENT_STORAGE_UNAVAILABLE', 503);
  }

  async write(
    source: AsyncIterable<Uint8Array>,
    key: string = randomUUID()
  ): Promise<StoredOriginal> {
    this.validKey(key);
    const root = await this.root();
    const temporary = join(root, `${key}.upload`);
    let file: FileHandle | undefined;
    let size = 0;
    const hash = createHash('sha256');
    const prefix: Buffer[] = [];
    let prefixSize = 0;
    try {
      file = await open(
        temporary,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
        0o600
      );
      for await (const bytes of source) {
        const chunk = Buffer.from(bytes);
        size += chunk.length;
        if (size > 20_971_520) throw attachmentError('ATTACHMENT_TOO_LARGE', 413);
        hash.update(chunk);
        if (prefixSize < 65_536) {
          const p = chunk.subarray(0, 65_536 - prefixSize);
          prefix.push(p);
          prefixSize += p.length;
        }
        let offset = 0;
        while (offset < chunk.length)
          offset += (await file.write(chunk, offset, chunk.length - offset)).bytesWritten;
      }
      await file.sync();
      await file.close();
      file = undefined;
      // Link is exclusive (unlike rename, which could replace a prior immutable object).
      const { link } = await import('node:fs/promises');
      await link(temporary, join(root, key));
      await unlink(temporary);
      const directory = await open(root, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        await directory.sync();
      } finally {
        await directory.close();
      }
      return { key, byteSize: size, sha256: hash.digest('hex'), prefix: Buffer.concat(prefix) };
    } catch (e) {
      await file?.close().catch(() => undefined);
      await unlink(temporary).catch(() => undefined);
      if (e instanceof Error && 'getStatus' in e) throw e;
      throw attachmentError('ATTACHMENT_STORAGE_UNAVAILABLE', 503, true);
    }
  }

  async read(key: string, max: number): Promise<Buffer> {
    const file = await this.open(key);
    try {
      const stat = await file.stat();
      if (stat.size > max) throw attachmentError('ATTACHMENT_PROCESSING_LIMIT', 422);
      const data = await file.readFile();
      if (data.length > max) throw attachmentError('ATTACHMENT_PROCESSING_LIMIT', 422);
      return data;
    } finally {
      await file.close();
    }
  }

  async open(key: string): Promise<FileHandle> {
    this.validKey(key);
    try {
      const file = await open(
        join(await this.root(), key),
        constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
      );
      if (!(await file.stat()).isFile()) {
        await file.close();
        throw new Error();
      }
      return file;
    } catch {
      throw attachmentError('ATTACHMENT_ORIGINAL_UNAVAILABLE', 503, true);
    }
  }

  async verify(key: string, size: number, sha256: string | null): Promise<void> {
    const file = await this.open(key);
    try {
      if ((await file.stat()).size !== size) throw new Error();
      const hash = createHash('sha256');
      for await (const chunk of file.createReadStream({ autoClose: false }))
        hash.update(chunk as Buffer);
      if (hash.digest('hex') !== sha256) throw new Error();
    } catch {
      throw attachmentError('ATTACHMENT_ORIGINAL_UNAVAILABLE', 503, true);
    } finally {
      await file.close();
    }
  }

  async delete(key: string): Promise<void> {
    this.validKey(key);
    const root = await this.root();
    for (const name of [key, `${key}.upload`]) {
      try {
        await unlink(join(root, name));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      }
    }
    const dir = await open(root, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      await dir.sync();
    } finally {
      await dir.close();
    }
  }

  async *orphans(before: Date): AsyncIterable<string> {
    const root = await this.root();
    const dir = await readdir(root);
    for (const name of dir) {
      const key = name.replace(/\.upload$/, '');
      if (!/^[0-9a-f-]{36}$/.test(key)) continue;
      const s = await lstat(join(root, name));
      if (s.isFile() && s.mtime < before) yield key;
    }
  }
}
