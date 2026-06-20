import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

export const permissionGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requiredPermissions = route.data['permissions'] as string[] | undefined;

  if (!requiredPermissions?.length) {
    return true;
  }

  if (requiredPermissions.every((permission) => authService.hasPermission(permission))) {
    return true;
  }

  void router.navigate(['/dashboard']);
  return false;
};
