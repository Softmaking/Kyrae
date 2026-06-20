import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { BranchesComponent } from './pages/branches.component';

export const BRANCHES_ROUTES: Routes = [
  {
    path: '',
    component: BranchesComponent,
    canActivate: [authGuard, permissionGuard],
    data: { permissions: ['BRANCHES_READ'] },
  },
];
