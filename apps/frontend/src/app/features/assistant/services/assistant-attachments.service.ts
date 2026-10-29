import { HttpClient, HttpEventType, HttpParams } from '@angular/common/http';
import { Injectable, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { Subscription, firstValueFrom, timeout } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../auth/services/auth.service';
import { validateAttachmentSelection } from '../models/attachment.model';
import type {
  AssistantAttachmentCapabilitiesDto,
  AssistantAttachmentDto,
  AssistantUploadBatchDto,
  SendAssistantMessageCommand,
  StagedAttachment,
} from '../models/attachment.model';

@Injectable()
export class AssistantAttachmentsService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${API_BASE_URL}/messages`;
  readonly staged = signal<StagedAttachment[]>([]);
  readonly capabilities = signal<AssistantAttachmentCapabilitiesDto | null>(null);
  readonly notice = signal('');
  readonly locked = signal(false);
  readonly ready = computed(
    () =>
      this.staged().length > 0 &&
      this.staged().every((f) => f.state === 'ready' && f.descriptor?.lifecycle === 'ready')
  );
  private batch: AssistantUploadBatchDto | null = null;
  private batchKey = crypto.randomUUID();
  private batchRequest: Promise<AssistantUploadBatchDto> | null = null;
  private submission: SendAssistantMessageCommand | null = null;
  private generation = 0;
  private sessionId?: string;
  private transfers = new Map<string, Subscription>();
  private urls = new Set<string>();
  private blobRequests = new Set<Subscription>();

  constructor() {
    effect(() => {
      if (!this.auth.isAuthenticated()) this.reset();
    });
  }

  async loadCapabilities(sessionId?: string): Promise<void> {
    this.sessionId = sessionId;
    this.capabilities.set(null);
    const generation = this.generation;
    try {
      const capabilities = await firstValueFrom(
        this.http.get<AssistantAttachmentCapabilitiesDto>(`${this.base}/attachment-capabilities`, {
          params: sessionId ? new HttpParams().set('sessionId', sessionId) : undefined,
        })
      );
      if (generation === this.generation) this.capabilities.set(capabilities);
    } catch {
      if (generation === this.generation)
        this.notice.set(
          'No se pudo consultar la disponibilidad del análisis. Puedes seleccionar archivos y volver a consultar.'
        );
    }
  }

  async select(files: File[]): Promise<void> {
    if (this.locked()) return;
    const errors = validateAttachmentSelection(
      files,
      this.staged().map((f) => f.file)
    );
    this.notice.set(errors.join(' '));
    if (errors.length || !files.length) return;
    this.staged.update((current) => [
      ...current,
      ...files.map((file) => ({
        file,
        clientFileId: crypto.randomUUID(),
        state: 'queued' as const,
        progress: null,
      })),
    ]);
    await this.pump();
  }

  private async ensureBatch(): Promise<AssistantUploadBatchDto> {
    if (this.batch) return this.batch;
    if (!this.batchRequest) {
      const generation = this.generation;
      this.batchRequest = firstValueFrom(
        this.http.post<AssistantUploadBatchDto>(`${this.base}/upload-batches`, {
          clientBatchId: this.batchKey,
          sessionId: this.sessionId,
          channel: 'web',
        })
      )
        .then((batch) => {
          if (generation !== this.generation) {
            this.http
              .delete(`${this.base}/upload-batches/${batch.id}`)
              .subscribe({ error: () => {} });
            throw new Error('Draft cancelled');
          }
          this.batch = batch;
          this.capabilities.set(batch.capabilities);
          return batch;
        })
        .finally(() => {
          if (generation === this.generation) this.batchRequest = null;
        });
    }
    return this.batchRequest;
  }

  private async pump(): Promise<void> {
    const generation = this.generation;
    let batch: AssistantUploadBatchDto;
    try {
      batch = await this.ensureBatch();
    } catch {
      if (generation === this.generation)
        this.staged.update((files) =>
          files.map((f) =>
            f.state === 'queued'
              ? {
                  ...f,
                  state: 'failed',
                  error: 'No se pudo reservar la carga. Reintenta sin cambiar los archivos.',
                }
              : f
          )
        );
      return;
    }
    if (generation !== this.generation || this.locked()) return;
    for (const item of this.staged().filter((f) => f.state === 'queued')) {
      if (this.transfers.size >= 2) break;
      this.update(item.clientFileId, { state: 'uploading', progress: null, error: undefined });
      const form = new FormData();
      form.append('clientFileId', item.clientFileId);
      form.append('file', item.file, item.file.name);
      const subscription = new Subscription();
      this.transfers.set(item.clientFileId, subscription);
      const deadline = setTimeout(() => {
        subscription.unsubscribe();
        this.transfers.delete(item.clientFileId);
        if (generation === this.generation) {
          this.update(item.clientFileId, {
            state: 'failed',
            error: 'Tiempo máximo de carga alcanzado. Reintenta para recuperar la misma carga.',
          });
          void this.pump();
        }
      }, 300_000);
      subscription.add(() => clearTimeout(deadline));
      subscription.add(
        this.http
          .post<AssistantAttachmentDto>(`${this.base}/upload-batches/${batch.id}/files`, form, {
            observe: 'events',
            reportProgress: true,
          })
          .pipe(timeout({ first: 300_000, each: 300_000 }))
          .subscribe({
            next: (event) => {
              if (generation !== this.generation) return;
              if (event.type === HttpEventType.UploadProgress && event.total)
                this.update(item.clientFileId, {
                  progress: Math.min(100, Math.round((event.loaded / event.total) * 100)),
                });
              if (event.type === HttpEventType.Response && event.body)
                this.update(item.clientFileId, {
                  descriptor: event.body,
                  state: event.body.lifecycle === 'ready' ? 'ready' : 'failed',
                  error:
                    event.body.lifecycle === 'ready'
                      ? undefined
                      : 'El servidor aún no confirmó el original. Reintenta para consultar su estado.',
                });
            },
            error: () => {
              subscription.unsubscribe();
              if (generation === this.generation) {
                this.update(item.clientFileId, {
                  state: 'failed',
                  error: 'Carga no confirmada. Reintenta con el mismo archivo o elimínalo.',
                });
                this.transfers.delete(item.clientFileId);
                void this.pump();
              }
            },
            complete: () => {
              subscription.unsubscribe();
              this.transfers.delete(item.clientFileId);
              if (generation === this.generation) void this.pump();
            },
          })
      );
    }
  }

  retry(id: string): void {
    if (this.locked()) return;
    this.update(id, { state: 'queued', error: undefined });
    void this.pump();
  }

  async remove(id: string): Promise<void> {
    if (this.locked()) return;
    const item = this.staged().find((f) => f.clientFileId === id);
    const generation = this.generation;
    if (!item) return;
    this.transfers.get(id)?.unsubscribe();
    this.transfers.delete(id);
    this.update(id, { state: 'deleting' });
    try {
      if (this.batch) {
        // Reconcile even a lost upload acknowledgement before removing the reservation.
        const batch = await firstValueFrom(
          this.http.get<AssistantUploadBatchDto>(`${this.base}/upload-batches/${this.batch.id}`)
        );
        if (generation !== this.generation) return;
        const descriptor = batch.attachments.find((f) => f.clientFileId === id);
        if (descriptor)
          await firstValueFrom(
            this.http.delete(`${this.base}/upload-batches/${batch.id}/files/${descriptor.id}`)
          );
      }
      if (generation === this.generation)
        this.staged.update((files) => files.filter((f) => f.clientFileId !== id));
    } catch {
      if (generation === this.generation)
        this.update(id, {
          state: 'failed',
          error: 'No se confirmó la eliminación. Reintenta eliminar antes de enviar.',
        });
    }
    if (generation === this.generation && this.staged().some((f) => f.state === 'queued'))
      void this.pump();
  }

  command(message: string): SendAssistantMessageCommand {
    if (this.submission) return this.submission;
    if (!this.ready() || !this.batch || !message.trim() || message.trim().length > 4000)
      throw new Error('Attachments not ready');
    this.submission = {
      message: message.trim(),
      sessionId: this.sessionId,
      channel: 'web',
      uploadBatchId: this.batch.id,
      attachmentIds: this.staged().map((f) => f.descriptor!.id),
      clientMessageId: crypto.randomUUID(),
    };
    this.locked.set(true);
    return this.submission;
  }

  committed(): void {
    this.reset(false);
  }

  reset(cancel = true): void {
    const batch = this.batch;
    this.generation++;
    this.transfers.forEach((s) => s.unsubscribe());
    this.transfers.clear();
    if (cancel) this.clearBlobs();
    this.batch = null;
    this.batchRequest = null;
    this.batchKey = crypto.randomUUID();
    this.submission = null;
    this.staged.set([]);
    this.locked.set(false);
    this.notice.set('');
    if (cancel && batch?.state === 'open')
      this.http.delete(`${this.base}/upload-batches/${batch.id}`).subscribe({ error: () => {} });
  }

  clearBlobs(): void {
    this.blobRequests.forEach((s) => s.unsubscribe());
    this.blobRequests.clear();
    this.urls.forEach((url) => URL.revokeObjectURL(url));
    this.urls.clear();
  }

  releaseUrl(url: string): void {
    if (this.urls.delete(url)) URL.revokeObjectURL(url);
  }

  thumbnail(id: string, ready: (url: string) => void): Subscription {
    const subscription = this.http
      .get(`${this.base}/attachments/${id}/thumbnail`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          if (!['image/jpeg', 'image/png'].includes(blob.type) || blob.size > 131072) return;
          const url = URL.createObjectURL(blob);
          this.urls.add(url);
          ready(url);
        },
        error: () => {},
      });
    this.blobRequests.add(subscription);
    subscription.add(() => this.blobRequests.delete(subscription));
    return subscription;
  }

  async download(file: AssistantAttachmentDto): Promise<void> {
    this.notice.set('');
    const generation = this.generation;
    try {
      await new Promise<void>((resolve, reject) => {
        const subscription = this.http
          .get(`${this.base}/attachments/${file.id}/content`, { responseType: 'blob' })
          .subscribe({
            next: (blob) => {
              if (generation !== this.generation) return;
              const url = URL.createObjectURL(blob);
              this.urls.add(url);
              const link = document.createElement('a');
              link.href = url;
              link.download = file.originalFilename;
              link.click();
              setTimeout(() => this.releaseUrl(url), 1000);
            },
            error: reject,
            complete: resolve,
          });
        this.blobRequests.add(subscription);
        subscription.add(() => this.blobRequests.delete(subscription));
      });
    } catch {
      if (generation === this.generation)
        this.notice.set(
          `${file.originalFilename}: no se pudo descargar el original. Vuelve a intentarlo.`
        );
    }
  }

  private update(id: string, patch: Partial<StagedAttachment>): void {
    this.staged.update((files) =>
      files.map((f) => (f.clientFileId === id ? { ...f, ...patch } : f))
    );
  }
  ngOnDestroy(): void {
    this.reset();
  }
}
