import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

export interface ToastEvent {
  id: string;
  title: string;
  body: string;
  sessionId: string | null;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly router = inject(Router);
  private toastIdCounter = 0;

  readonly toastEvent = new Subject<ToastEvent>();

  requestPermission(): void {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }

  showBrowserNotification(title: string, body: string, onClick?: () => void): void {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const notification = new Notification(title, { body, icon: '/favicon.ico' });
      notification.onclick = () => {
        notification.close();
        onClick?.();
      };
    } catch {
      // fallback silently
    }
  }

  showAutomation(title: string, body: string, sessionId: string | null): void {
    const truncatedBody = body.length > 120 ? `${body.slice(0, 120)}...` : body;
    const id = `toast-${++this.toastIdCounter}`;

    this.toastEvent.next({ id, title, body: truncatedBody, sessionId });

    this.showBrowserNotification(title, truncatedBody, () => {
      if (sessionId) {
        void this.router.navigate(['/assistant'], { queryParams: { sessionId } });
      } else {
        void this.router.navigate(['/assistant']);
      }
    });
  }
}
