import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { AutomationSchedulesComponent } from './pages/automation-schedules.component';

export const AUTOMATION_SCHEDULES_ROUTES: Routes = [
  {
    path: '',
    component: AutomationSchedulesComponent,
    canActivate: [authGuard, permissionGuard],
    data: { permissions: ['AUTOMATION_READ'] },
  },
];
