import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { AssistantComponent } from './pages/assistant.component';

export const ASSISTANT_ROUTES: Routes = [
  {
    path: '',
    component: AssistantComponent,
    canActivate: [authGuard, permissionGuard],
    data: { permissions: ['ASSISTANT_CHAT_USE'] },
  },
];
