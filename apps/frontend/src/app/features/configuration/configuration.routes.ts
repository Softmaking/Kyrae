import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { ConfigurationComponent } from './pages/configuration.component';

export const CONFIGURATION_ROUTES: Routes = [
  {
    path: '',
    component: ConfigurationComponent,
    canActivate: [authGuard, permissionGuard],
    data: { permissions: ['CONFIGURATION_READ'] },
  },
];
