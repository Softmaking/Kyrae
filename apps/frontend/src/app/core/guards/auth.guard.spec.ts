import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../../features/auth/services/auth.service';

describe('authGuard', () => {
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'auth/login', component: {} as any },
          { path: '**', component: {} as any },
        ]),
        {
          provide: AuthService,
          useFactory: () => {
            const service = new AuthService({} as any);
            service.isAuthenticated.set(true);
            return service;
          },
        },
      ],
    });

    authService = TestBed.inject(AuthService);
  });

  it('should be defined', () => {
    expect(authGuard).toBeDefined();
  });

  it('should allow access when authenticated', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(undefined!, undefined!));
    expect(result).toBe(true);
  });

  it('should deny access when not authenticated', () => {
    authService.isAuthenticated.set(false);
    const result = TestBed.runInInjectionContext(() => authGuard(undefined!, undefined!));
    expect(result).toBe(false);
  });

  it('should navigate to login on denial', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    authService.isAuthenticated.set(false);
    TestBed.runInInjectionContext(() => authGuard(undefined!, undefined!));

    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });
});
