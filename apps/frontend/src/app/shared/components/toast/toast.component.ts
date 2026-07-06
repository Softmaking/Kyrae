import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService, ToastEvent } from '../../../core/services/notification.service';

interface ToastItem {
  id: string;
  title: string;
  body: string;
  sessionId: string | null;
  visible: boolean;
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed right-4 top-24 z-[100] flex flex-col gap-2" aria-live="polite">
      @for (toast of toasts(); track toast.id) {
        <div
          class="w-80 cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 transition-all duration-300"
          [class.opacity-0]="!toast.visible"
          [class.opacity-100]="toast.visible"
          [class.translate-y-2]="!toast.visible"
          [class.translate-y-0]="toast.visible"
          (click)="clickToast(toast)"
          role="alert"
        >
          <p class="text-sm font-semibold text-slate-900">{{ toast.title }}</p>
          <p class="mt-0.5 text-xs text-slate-500">{{ toast.body }}</p>
        </div>
      }
    </div>
  `,
})
export class ToastComponent implements OnInit, OnDestroy {
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly toasts = signal<ToastItem[]>([]);

  ngOnInit(): void {
    this.notificationService.toastEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: ToastEvent) => this.addToast(event));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private addToast(event: ToastEvent): void {
    const toast: ToastItem = { ...event, visible: true };
    this.toasts.update((current) => [...current, toast]);

    setTimeout(() => this.closeToast(toast), 5000);
  }

  clickToast(toast: ToastItem): void {
    if (!toast.visible) return;

    this.toasts.update((current) =>
      current.map((t) => (t.id === toast.id ? { ...t, visible: false } : t))
    );

    setTimeout(() => {
      this.toasts.update((current) => current.filter((t) => t.id !== toast.id));
      if (toast.sessionId) {
        void this.router.navigate(['/assistant'], { queryParams: { sessionId: toast.sessionId } });
      } else {
        void this.router.navigate(['/assistant']);
      }
    }, 300);
  }

  private closeToast(toast: ToastItem): void {
    this.toasts.update((current) =>
      current.map((t) => (t.id === toast.id ? { ...t, visible: false } : t))
    );

    setTimeout(() => {
      this.toasts.update((current) => current.filter((t) => t.id !== toast.id));
    }, 300);
  }
}
