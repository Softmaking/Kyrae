import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../features/auth/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './app-navbar.component.html',
  styleUrl: './app-navbar.component.css',
})
export class AppNavbarComponent {
  @Input({ required: true }) sidebarCollapsed = false;
  @Output() sidebarToggle = new EventEmitter<void>();
  @Output() mobileMenuToggle = new EventEmitter<void>();

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userMenuOpen = signal(false);
  readonly user = this.authService.user;
  readonly primaryRole = computed(() => this.user()?.roles[0] ?? 'Usuario');
  readonly initials = computed(() => {
    const name = this.user()?.fullName || this.user()?.email || 'SM';
    return name
      .split(/\s|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  });

  toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  async logout(): Promise<void> {
    this.userMenuOpen.set(false);
    await firstValueFrom(this.authService.logoutRemote());
    await this.router.navigate(['/auth/login']);
  }
}
