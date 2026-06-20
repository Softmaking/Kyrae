import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';

const mockLoginResponse = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  tokenType: 'Bearer',
  user: {
    id: 'u-1',
    email: 'admin@test.cl',
    firstName: 'Admin',
    firstSurname: 'User',
    fullName: 'Admin User',
    roles: ['admin'],
    permissions: ['USERS_READ', 'USERS_UPDATE'],
  },
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should be unauthenticated when no token in storage', () => {
      expect(service.isAuthenticated()).toBe(false);
      expect(service.user()).toBeNull();
    });

    it('should restore session from localStorage', () => {
      localStorage.setItem('sm_access_token', 'existing-token');
      localStorage.setItem('sm_user', JSON.stringify(mockLoginResponse.user));

      const restored = new AuthService({} as any);
      expect(restored.isAuthenticated()).toBe(true);
      expect(restored.user()).toEqual(mockLoginResponse.user);
    });

    it('should ignore corrupted user data in localStorage', () => {
      localStorage.setItem('sm_access_token', 'existing-token');
      localStorage.setItem('sm_user', '{invalid}');

      const restored = new AuthService({} as any);
      expect(restored.isAuthenticated()).toBe(true);
      expect(restored.user()).toBeNull();
      expect(localStorage.getItem('sm_user')).toBeNull();
    });

    it('should ignore user data with missing fields in localStorage', () => {
      localStorage.setItem('sm_access_token', 'existing-token');
      localStorage.setItem('sm_user', JSON.stringify({ id: 'u-1' }));

      const restored = new AuthService({} as any);
      expect(restored.isAuthenticated()).toBe(true);
      expect(restored.user()).toBeNull();
    });
  });

  describe('login', () => {
    it('should send POST to /auth/login with credentials', async () => {
      const promise = firstValueFrom(service.login('admin@test.cl', 'password'));

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'admin@test.cl', password: 'password' });
      req.flush(mockLoginResponse);

      await promise;
    });

    it('should persist token and user on success', async () => {
      const promise = firstValueFrom(service.login('admin@test.cl', 'password'));

      httpMock.expectOne(`${API_BASE_URL}/auth/login`).flush(mockLoginResponse);
      await promise;

      expect(localStorage.getItem('sm_access_token')).toBe('test-access-token');
      expect(localStorage.getItem('sm_refresh_token')).toBe('test-refresh-token');
      expect(JSON.parse(localStorage.getItem('sm_user')!)).toEqual(mockLoginResponse.user);
    });

    it('should update signals on successful login', async () => {
      const promise = firstValueFrom(service.login('admin@test.cl', 'password'));

      httpMock.expectOne(`${API_BASE_URL}/auth/login`).flush(mockLoginResponse);
      await promise;

      expect(service.isAuthenticated()).toBe(true);
      expect(service.user()).toEqual(mockLoginResponse.user);
    });
  });

  describe('logout', () => {
    it('should clear localStorage and reset signals', () => {
      localStorage.setItem('sm_access_token', 'token');
      localStorage.setItem('sm_refresh_token', 'refresh-token');
      localStorage.setItem('sm_user', JSON.stringify(mockLoginResponse.user));
      service.isAuthenticated.set(true);
      service.user.set(mockLoginResponse.user);

      service.logout();

      expect(localStorage.getItem('sm_access_token')).toBeNull();
      expect(localStorage.getItem('sm_refresh_token')).toBeNull();
      expect(localStorage.getItem('sm_user')).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.user()).toBeNull();
    });
  });

  describe('logoutRemote', () => {
    it('should call backend logout and clear session', async () => {
      localStorage.setItem('sm_access_token', 'token');
      localStorage.setItem('sm_refresh_token', 'refresh-token');
      localStorage.setItem('sm_user', JSON.stringify(mockLoginResponse.user));
      service.isAuthenticated.set(true);
      service.user.set(mockLoginResponse.user);

      const promise = firstValueFrom(service.logoutRemote());

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/logout`);
      expect(req.request.method).toBe('POST');
      req.flush({});

      await promise;

      expect(localStorage.getItem('sm_access_token')).toBeNull();
      expect(localStorage.getItem('sm_refresh_token')).toBeNull();
      expect(localStorage.getItem('sm_user')).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.user()).toBeNull();
    });
  });

  describe('refresh', () => {
    it('should refresh session and persist tokens/user', async () => {
      localStorage.setItem('sm_refresh_token', 'stored-refresh-token');

      const promise = firstValueFrom(service.refresh());

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'stored-refresh-token' });
      req.flush(mockLoginResponse);

      await promise;

      expect(localStorage.getItem('sm_access_token')).toBe('test-access-token');
      expect(localStorage.getItem('sm_refresh_token')).toBe('test-refresh-token');
      expect(service.user()).toEqual(mockLoginResponse.user);
    });
  });

  describe('getAccessToken', () => {
    it('should return token from localStorage', () => {
      localStorage.setItem('sm_access_token', 'my-token');
      expect(service.getAccessToken()).toBe('my-token');
    });

    it('should return null when no token exists', () => {
      expect(service.getAccessToken()).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has the permission', () => {
      service.user.set(mockLoginResponse.user);
      expect(service.hasPermission('USERS_READ')).toBe(true);
    });

    it('should return false when user lacks the permission', () => {
      service.user.set(mockLoginResponse.user);
      expect(service.hasPermission('PERMISSIONS_READ')).toBe(false);
    });

    it('should return false when user is null', () => {
      service.user.set(null);
      expect(service.hasPermission('USERS_READ')).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the role', () => {
      service.user.set(mockLoginResponse.user);
      expect(service.hasRole('admin')).toBe(true);
    });

    it('should return false when user lacks the role', () => {
      service.user.set(mockLoginResponse.user);
      expect(service.hasRole('editor')).toBe(false);
    });

    it('should return false when user is null', () => {
      service.user.set(null);
      expect(service.hasRole('admin')).toBe(false);
    });
  });
});
