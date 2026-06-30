import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../features/auth/services/auth.service';
import { ADMIN_MENU, AdminMenuIcon } from '../../menu/admin-menu.config';

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './app-sidenav.component.html',
  styleUrl: './app-sidenav.component.css',
})
export class AppSidenavComponent {
  @Input({ required: true }) collapsed = false;
  @Input({ required: true }) mobileOpen = false;
  @Output() mobileClose = new EventEmitter<void>();

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly menuSections = computed(() =>
    ADMIN_MENU.map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.requiredPermissions?.length
          ? item.requiredPermissions.every((permission) =>
              this.authService.hasPermission(permission)
            )
          : true
      ),
    })).filter((section) => section.items.length > 0)
  );
  readonly logoUrl = '/assets/img/app-img/logo-sm.png';

  async logout(): Promise<void> {
    this.mobileClose.emit();
    await firstValueFrom(this.authService.logoutRemote());
    await this.router.navigate(['/auth/login']);
  }

  iconPath(icon: AdminMenuIcon): string {
    const icons: Record<AdminMenuIcon, string> = {
      dashboard:
        'M3 13.125C3 12.504 3.504 12 4.125 12h5.25c.621 0 1.125.504 1.125 1.125v6.75C10.5 20.496 9.996 21 9.375 21h-5.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM13.5 4.125C13.5 3.504 14.004 3 14.625 3h5.25C20.496 3 21 3.504 21 4.125v6.75c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-6.75ZM3 4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v3.75C10.5 8.496 9.996 9 9.375 9h-5.25A1.125 1.125 0 0 1 3 7.875v-3.75ZM13.5 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-3.75Z',
      assistant:
        'M12 3.75a8.25 8.25 0 0 0-8.25 8.25v1.5A3.75 3.75 0 0 0 7.5 17.25h.75v-7.5H7.5a3.73 3.73 0 0 0-2.25.75A6.75 6.75 0 0 1 18.75 10.5a3.73 3.73 0 0 0-2.25-.75h-.75v7.5h.75a3.75 3.75 0 0 0 3.75-3.75V12A8.25 8.25 0 0 0 12 3.75Zm-3 12.75h6m-4.5 3h3',
      organizations:
        'M3.75 21h16.5M4.5 3h15l-.75 18H5.25L4.5 3Zm3.75 4.5h1.5m4.5 0h1.5m-7.5 3.75h1.5m4.5 0h1.5m-7.5 3.75h1.5m4.5 0h1.5',
      branches:
        'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.008v.008H3.75V6.75Zm0 5.25h.008v.008H3.75V12Zm0 5.25h.008v.008H3.75v-.008Z',
      users:
        'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
      roles:
        'M9 12.75 11.25 15 15 9.75m5.25 0v9a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25v-9m13.5-3.75h.008v.008h-.008V6Zm-12 0h.008v.008H6V6ZM3 6.75V4.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 4.5v2.25',
      permissions:
        'M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z',
      audit: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
      configuration:
        'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.075.04.149.083.22.127.324.2.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a7.723 7.723 0 0 1 0 .255c-.007.379.138.751.431.992l1.003.827c.424.35.534.955.26 1.431l-1.296 2.247a1.125 1.125 0 0 1-1.37.49l-1.217-.456c-.355-.133-.751-.076-1.075.124a6.57 6.57 0 0 1-.22.128c-.332.183-.582.495-.645.869l-.213 1.281c-.09.542-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 0 1-.22-.127c-.324-.2-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 0 1-1.37-.49l-1.296-2.247a1.125 1.125 0 0 1 .26-1.431l1.003-.827c.293-.241.438-.613.431-.992a8.033 8.033 0 0 1 0-.255c.007-.379-.138-.751-.431-.992l-1.003-.827a1.125 1.125 0 0 1-.26-1.431l1.296-2.247a1.125 1.125 0 0 1 1.37-.49l1.217.456c.355.133.751.076 1.075-.124.071-.044.145-.086.22-.128.332-.183.582-.495.645-.869l.213-1.281Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    };

    return icons[icon];
  }
}
