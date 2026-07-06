import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Routes } from '@angular/router';
import { ASSISTANT_ROUTES } from './features/assistant/assistant.routes';
import { AUDIT_ROUTES } from './features/audit/audit.routes';
import { AUTH_ROUTES } from './features/auth/auth.routes';
import { AUTOMATION_SCHEDULES_ROUTES } from './features/automation-schedules/automation-schedules.routes';
import { AuthService } from './features/auth/services/auth.service';
import { BRANCHES_ROUTES } from './features/branches/branches.routes';
import { CONFIGURATION_ROUTES } from './features/configuration/configuration.routes';
import { DashboardLayoutComponent } from './core/layout/dashboard-layout/dashboard-layout.component';
import { DASHBOARD_ROUTES } from './features/dashboard/dashboard.routes';
import { ORGANIZATIONS_ROUTES } from './features/organizations/organizations.routes';
import { PERMISSIONS_ROUTES } from './features/permissions/permissions.routes';
import { PUBLIC_ROUTES } from './features/public/public.routes';
import { PublicNotFoundComponent } from './features/public/pages/public-not-found.component';
import { ROLES_ROUTES } from './features/roles/roles.routes';
import { USERS_ROUTES } from './features/users/users.routes';

export const routes: Routes = [
  { path: '', children: PUBLIC_ROUTES },
  { path: 'auth', children: AUTH_ROUTES },
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      { path: 'dashboard', children: DASHBOARD_ROUTES },
      { path: 'assistant', children: ASSISTANT_ROUTES },
      { path: 'automation-schedules', children: AUTOMATION_SCHEDULES_ROUTES },
      { path: 'organizations', children: ORGANIZATIONS_ROUTES },
      { path: 'branches', children: BRANCHES_ROUTES },
      { path: 'users', children: USERS_ROUTES },
      { path: 'roles', children: ROLES_ROUTES },
      { path: 'permissions', children: PERMISSIONS_ROUTES },
      { path: 'audit', children: AUDIT_ROUTES },
      { path: 'configuration', children: CONFIGURATION_ROUTES },
    ],
  },
  {
    path: '**',
    canActivate: [
      () => {
        if (!inject(AuthService).isAuthenticated()) {
          return inject(Router).parseUrl('/');
        }
        return true;
      },
    ],
    component: PublicNotFoundComponent,
  },
];
