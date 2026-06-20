import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { AuditComponent } from './pages/audit.component';

export const AUDIT_ROUTES: Routes = [
  {
    path: '',
    component: AuditComponent,
    canActivate: [authGuard, permissionGuard],
    data: { permissions: ['AUDIT_READ'] },
  },
];
