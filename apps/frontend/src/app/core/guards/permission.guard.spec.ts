import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { permissionGuard } from './permission.guard';
import { AuthService } from '../../features/auth/services/auth.service';
import { UserProfile } from '../../features/auth/models/auth.model';

const mockUser: UserProfile = {
  id: 'u-1',
  email: 'admin@test.cl',
  firstName: 'Admin',
  firstSurname: 'User',
  fullName: 'Admin User',
  roles: ['admin'],
  permissions: ['USERS_READ', 'USERS_UPDATE', 'ROLES_READ'],
};

function routeWithPermissions(permissions?: string[]) {
  return { data: permissions ? { permissions } : {} } as any;
}

describe('permissionGuard', () => {
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard', component: {} as any },
          { path: '**', component: {} as any },
        ]),
        {
          provide: AuthService,
          useFactory: () => {
            const service = new AuthService({} as any);
            service.user.set(mockUser);
            return service;
          },
        },
      ],
    });

    authService = TestBed.inject(AuthService);
  });

  it('should allow access when no permissions are required', () => {
    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(routeWithPermissions(), undefined!)
    );
    expect(result).toBe(true);
  });

  it('should allow access when permissions array is empty', () => {
    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(routeWithPermissions([]), undefined!)
    );
    expect(result).toBe(true);
  });

  it('should allow access when user has the required permission', () => {
    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(routeWithPermissions(['USERS_READ']), undefined!)
    );
    expect(result).toBe(true);
  });

  it('should allow access when user has all required permissions', () => {
    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(routeWithPermissions(['USERS_READ', 'ROLES_READ']), undefined!)
    );
    expect(result).toBe(true);
  });

  it('should deny access when user lacks the required permission', () => {
    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(routeWithPermissions(['PERMISSIONS_READ']), undefined!)
    );
    expect(result).toBe(false);
  });

  it('should deny access when user lacks one of the required permissions', () => {
    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(routeWithPermissions(['USERS_READ', 'PERMISSIONS_READ']), undefined!)
    );
    expect(result).toBe(false);
  });

  it('should deny access when user is null', () => {
    authService.user.set(null);
    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(routeWithPermissions(['USERS_READ']), undefined!)
    );
    expect(result).toBe(false);
  });

  it('should deny access when user has empty permissions', () => {
    authService.user.set({ ...mockUser, permissions: [] });
    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(routeWithPermissions(['USERS_READ']), undefined!)
    );
    expect(result).toBe(false);
  });

  it('should navigate to dashboard on denial', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    authService.user.set(null);
    TestBed.runInInjectionContext(() =>
      permissionGuard(routeWithPermissions(['USERS_READ']), undefined!)
    );

    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });
});
