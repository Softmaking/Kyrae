import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { UsersComponent } from './pages/users.component';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    component: UsersComponent,
    canActivate: [authGuard, permissionGuard],
    data: { permissions: ['USERS_READ'] },
  },
];
