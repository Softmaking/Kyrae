import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppNavbarComponent } from '../components/app-navbar/app-navbar.component';
import { AppSidenavComponent } from '../components/app-sidenav/app-sidenav.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, AppNavbarComponent, AppSidenavComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css',
})
export class DashboardLayoutComponent {
  private readonly sidebarCollapsedKey = 'sm_sidebar_collapsed';

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
