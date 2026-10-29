import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AssistantAttachmentsService } from '../../services/assistant-attachments.service';
import { AttachmentCoverageComponent } from '../attachment-coverage/attachment-coverage.component';
import type { AssistantAttachmentDto } from '../../models/attachment.model';

@Component({
  selector: 'app-attachment-list',
  standalone: true,
  imports: [AttachmentCoverageComponent],
  templateUrl: './attachment-list.component.html',
  styleUrl: './attachment-list.component.css',
})
export class AttachmentListComponent implements OnDestroy {
  readonly files = input<AssistantAttachmentDto[]>([]);
  readonly uploads = inject(AssistantAttachmentsService);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly thumbnails = signal<Record<string, string>>({});
  private observer?: IntersectionObserver;
  private visible = false;
  private requests = new Map<string, Subscription>();
  constructor() {
    afterNextRender(() => {
      this.observer = new IntersectionObserver((entries) => {
        this.visible = entries.some((e) => e.isIntersecting);
        if (this.visible) this.load();
        else this.clear();
      });
      this.observer.observe(this.host.nativeElement);
    });
    effect(() => {
      this.files();
      if (this.visible) this.load();
    });
  }
  private load(): void {
    const files = this.files();
    for (const [id, url] of Object.entries(this.thumbnails())) {
      if (!files.some((f) => f.id === id && f.thumbnailAvailable)) {
        this.uploads.releaseUrl(url);
        this.thumbnails.update((values) => {
          const next = { ...values };
          delete next[id];
          return next;
        });
      }
    }
    // At most five bounded raster thumbnails per message; only when near viewport.
    for (const file of files.slice(0, 5)) {
      if (file.thumbnailAvailable && !this.requests.has(file.id))
        this.requests.set(
          file.id,
          this.uploads.thumbnail(file.id, (url) =>
            this.thumbnails.update((values) => ({ ...values, [file.id]: url }))
          )
        );
    }
  }
  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.clear();
  }
  private clear(): void {
    this.requests.forEach((s) => s.unsubscribe());
    this.requests.clear();
    Object.values(this.thumbnails()).forEach((url) => this.uploads.releaseUrl(url));
    this.thumbnails.set({});
  }
}
