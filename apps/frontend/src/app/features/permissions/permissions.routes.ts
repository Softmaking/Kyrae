import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { PermissionsComponent } from './pages/permissions.component';

export const PERMISSIONS_ROUTES: Routes = [
  {
    path: '',
    component: PermissionsComponent,
    canActivate: [authGuard, permissionGuard],
    data: { permissions: ['PERMISSIONS_READ'] },
  },
];
