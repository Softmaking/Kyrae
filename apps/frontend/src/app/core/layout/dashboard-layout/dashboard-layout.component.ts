import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppNavbarComponent } from '../components/app-navbar/app-navbar.component';
import { AppSidenavComponent } from '../components/app-sidenav/app-sidenav.component';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { NotificationService } from '../../services/notification.service';
import { AssistantRealtimeService } from '../../../features/assistant/services/assistant-realtime.service';
import type { AssistantRealtimeEvent } from '../../../features/assistant/models/assistant.model';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, AppNavbarComponent, AppSidenavComponent, ToastComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css',
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  private readonly notificationService = inject(NotificationService);
  private readonly realtimeService = inject(AssistantRealtimeService);
  private readonly sidebarCollapsedKey = 'sm_sidebar_collapsed';

  ngOnInit(): void {
    this.notificationService.requestPermission();
    this.realtimeService.connect();
    this.realtimeService.on('assistant.automation.received', this.handleAutomationEvent);
  }

  ngOnDestroy(): void {
    this.realtimeService.off('assistant.automation.received', this.handleAutomationEvent);
  }

  private readonly handleAutomationEvent = (event: AssistantRealtimeEvent): void => {
    const title =
      (event.metadata['automationTitle'] as string | undefined) ?? 'Automatización completada';
    this.notificationService.showAutomation(title, event.content ?? '', event.sessionId);
  };

  readonly sidebarCollapsed = signal(this.readSidebarCollapsed());
  readonly mobileMenuOpen = signal(false);

  toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => {
      const nextCollapsed = !collapsed;
      localStorage.setItem(this.sidebarCollapsedKey, String(nextCollapsed));
      return nextCollapsed;
    });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  private readSidebarCollapsed(): boolean {
    return localStorage.getItem(this.sidebarCollapsedKey) === 'true';
  }
}
