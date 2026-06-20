import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { RolesComponent } from './pages/roles.component';

export const ROLES_ROUTES: Routes = [
  {
    path: '',
    component: RolesComponent,
    canActivate: [authGuard, permissionGuard],
    data: { permissions: ['ROLES_READ'] },
  },
];
