import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpEventType } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistantAttachmentsService } from './assistant-attachments.service';
import { AuthService } from '../../auth/services/auth.service';
import { validateAttachmentSelection } from '../models/attachment.model';
import type { AssistantAttachmentDto, AssistantUploadBatchDto } from '../models/attachment.model';

const descriptor = (id: string, clientFileId: string): AssistantAttachmentDto => ({
  id,
  clientFileId,
  batchId: 'batch',
  sessionId: null,
  messageId: null,
  originalFilename: `${id}.txt`,
  byteSize: 1,
  mediaType: 'text/plain',
  category: 'text',
  lifecycle: 'ready',
  processingStatus: 'pending',
  processingVersion: 0,
  errorCode: null,
  errorMessage: null,
  downloadAvailable: true,
  thumbnailAvailable: false,
  createdAt: '',
  updatedAt: '',
});
const batch = {
  id: 'batch',
  state: 'open',
  attachments: [],
  capabilities: { available: false, unavailableReasons: ['profile_unverified'] },
} as unknown as AssistantUploadBatchDto;
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('attachment original limits', () => {
  const file = (name: string, size: number) => ({ name, size }) as File;
  it('accepts five exact 20 MiB originals without buffering bytes', () => {
    expect(
      validateAttachmentSelection(
        Array.from({ length: 5 }, (_, i) => file(`${i}.heic`, 20971520)),
        []
      )
    ).toEqual([]);
  });
  it('rejects a sixth selection explicitly and a byte above the boundary', () => {
    expect(
      validateAttachmentSelection(
        [file('six.txt', 1)],
        Array.from({ length: 5 }, () => file('x.txt', 1))
      ).join()
    ).toContain('Máximo 5');
    expect(validateAttachmentSelection([file('big.pdf', 20971521)], []).join()).toContain(
      'big.pdf'
    );
  });
  it('counts UTF-8 filename bytes inclusively and permits empty originals', () => {
    expect(validateAttachmentSelection([file('é'.repeat(125) + '.txt', 0)], [])).toEqual([]);
    expect(validateAttachmentSelection([file('é'.repeat(126) + '.txt', 0)], []).join()).toContain(
      '255 bytes'
    );
  });
});

describe('AssistantAttachmentsService HTTP state', () => {
  let service: AssistantAttachmentsService;
  let http: HttpTestingController;
  const authenticated = signal(true);
  beforeEach(() => {
    authenticated.set(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AssistantAttachmentsService,
        { provide: AuthService, useValue: { isAuthenticated: authenticated } },
      ],
    });
    service = TestBed.inject(AssistantAttachmentsService);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });
  afterEach(() => {
    service.committed();
    service.clearBlobs();
    http.verify({ ignoreCancelled: true });
    vi.restoreAllMocks();
  });
  async function stage(count = 1) {
    const selection = service.select(
      Array.from({ length: count }, (_, i) => new File(['x'], `${i}.heic`))
    );
    http.expectOne((r) => r.url.endsWith('/upload-batches')).flush(batch);
    await selection;
    return http.match((r) => r.url.endsWith('/files'));
  }
  it('reserves a draft with UUID, never invents live availability, and transfers at most two originals', async () => {
    const selection = service.select(
      Array.from({ length: 5 }, (_, i) => new File(['original'], `${i}.heic`))
    );
    const reservation = http.expectOne((r) => r.url.endsWith('/upload-batches'));
    expect(reservation.request.body).toMatchObject({ channel: 'web' });
    expect(reservation.request.body.sessionId).toBeUndefined();
    expect(reservation.request.body.clientBatchId).toMatch(/^[a-f0-9-]{36}$/);
    reservation.flush(batch);
    await selection;
    expect(service.capabilities()?.available).toBe(false);
    const transfers = http.match((r) => r.url.endsWith('/files'));
    expect(transfers).toHaveLength(2);
    const original = (transfers[0].request.body as FormData).get('file') as File;
    expect(original.name).toBe('0.heic');
    expect(original.size).toBe(8);
    const bytes = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(original);
    });
    expect(bytes).toBe('original');
    expect(service.staged().filter((f) => f.state === 'queued')).toHaveLength(3);
    expect(service.ready()).toBe(false);
    service.committed();
    expect(transfers.every((r) => r.cancelled)).toBe(true);
  });
  it('keeps progress indeterminate until real progress and ready only after server acknowledgement', async () => {
    const [request] = await stage();
    const id = service.staged()[0].clientFileId;
    expect(service.staged()[0].progress).toBeNull();
    request.event({ type: HttpEventType.UploadProgress, loaded: 1, total: 2 });
    expect(service.staged()[0].progress).toBe(50);
    expect(service.ready()).toBe(false);
    request.flush(descriptor('a', id));
    expect(service.ready()).toBe(true);
    const command = service.command('  compare  ');
    expect(command).toMatchObject({
      message: 'compare',
      uploadBatchId: 'batch',
      attachmentIds: ['a'],
    });
    expect(service.command('different draft')).toBe(command);
    expect(service.locked()).toBe(true);
  });
  it('retries an unacknowledged upload using the same clientFileId', async () => {
    const [request] = await stage();
    const key = (request.request.body as FormData).get('clientFileId') as string;
    request.flush({}, { status: 503, statusText: 'Unavailable' });
    expect(service.staged()[0].state).toBe('failed');
    service.retry(key);
    await tick();
    const retry = http.expectOne((r) => r.url.endsWith('/files'));
    expect((retry.request.body as FormData).get('clientFileId')).toBe(key);
    retry.flush(descriptor('a', key));
  });
  it('reconciles lost acknowledgements before DELETE removal and blocks send on failed removal', async () => {
    const [request] = await stage();
    const key = service.staged()[0].clientFileId;
    request.flush({}, { status: 503, statusText: 'Unavailable' });
    const removal = service.remove(key);
    http
      .expectOne((r) => r.method === 'GET' && r.url.endsWith('/upload-batches/batch'))
      .flush({ ...batch, attachments: [descriptor('a', key)] });
    await tick();
    http
      .expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/files/a'))
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await removal;
    expect(service.staged()).toHaveLength(1);
    expect(service.ready()).toBe(false);
  });
  it('cancels in-flight uploads and the batch on session cleanup', async () => {
    const requests = await stage(2);
    service.reset();
    expect(requests.every((r) => r.cancelled)).toBe(true);
    http
      .expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/upload-batches/batch'))
      .flush({ success: true });
    expect(service.staged()).toEqual([]);
  });
  it('accepts bounded raster thumbnails only, revoking owned URLs on cleanup', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:owned');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const ready = vi.fn();
    service.thumbnail('a', ready);
    http
      .expectOne((r) => r.url.endsWith('/a/thumbnail'))
      .flush(new Blob(['<svg/>'], { type: 'image/svg+xml' }));
    expect(create).not.toHaveBeenCalled();
    service.thumbnail('a', ready);
    http
      .expectOne((r) => r.url.endsWith('/a/thumbnail'))
      .flush(new Blob(['raster'], { type: 'image/png' }));
    expect(ready).toHaveBeenCalledWith('blob:owned');
    service.clearBlobs();
    expect(revoke).toHaveBeenCalledWith('blob:owned');
  });
  it('keeps original downloads independent of failed processing, with explicit HTTP errors', async () => {
    const download = service.download({
      ...descriptor('a', 'key'),
      lifecycle: 'attached',
      processingStatus: 'failed',
    });
    const request = http.expectOne((r) => r.url.endsWith('/a/content'));
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(), { status: 404, statusText: 'Not Found' });
    await download;
    expect(service.notice()).toContain('no se pudo descargar el original');
  });
});
