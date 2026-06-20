import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest.guard';
import { LoginComponent } from './pages/login.component';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
];
