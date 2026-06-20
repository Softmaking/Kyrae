import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { OrganizationsComponent } from './pages/organizations.component';

export const ORGANIZATIONS_ROUTES: Routes = [
  {
    path: '',
    component: OrganizationsComponent,
    canActivate: [authGuard, permissionGuard],
    data: { permissions: ['ORGANIZATIONS_READ'] },
  },
];
