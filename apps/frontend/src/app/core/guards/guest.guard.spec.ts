import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
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
            service.isAuthenticated.set(false);
            return service;
          },
        },
      ],
    });

    authService = TestBed.inject(AuthService);
  });

  it('should allow guests', () => {
    const result = TestBed.runInInjectionContext(() => guestGuard(undefined!, undefined!));
    expect(result).toBe(true);
  });

  it('should block authenticated users', () => {
    authService.isAuthenticated.set(true);
    const result = TestBed.runInInjectionContext(() => guestGuard(undefined!, undefined!));
    expect(result).toBe(false);
  });

  it('should redirect authenticated users to dashboard', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    authService.isAuthenticated.set(true);
    TestBed.runInInjectionContext(() => guestGuard(undefined!, undefined!));

    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });
});
