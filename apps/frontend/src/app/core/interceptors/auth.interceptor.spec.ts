import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../../features/auth/services/auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'auth/login', component: {} as any },
          { path: '**', component: {} as any },
        ]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        AuthService,
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('token injection', () => {
    it('should add Authorization header when token exists', () => {
      localStorage.setItem('sm_access_token', 'my-jwt-token');
      authService.isAuthenticated.set(true);

      httpClient.get('/test').subscribe();

      const req = httpMock.expectOne('/test');
      expect(req.request.headers.get('Authorization')).toBe('Bearer my-jwt-token');
      req.flush({});
    });

    it('should not add Authorization header when no token', () => {
      localStorage.clear();
      authService.isAuthenticated.set(false);

      httpClient.get('/test').subscribe();

      const req = httpMock.expectOne('/test');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });
  });

  describe('401 error handling', () => {
    it('should retry request after successful refresh', () => {
      localStorage.setItem('sm_access_token', 'expired-token');
      localStorage.setItem('sm_refresh_token', 'refresh-token');
      const logoutSpy = vi.spyOn(authService, 'logout');

      httpClient.get('/test').subscribe((response) => {
        expect(response).toEqual({ ok: true });
      });

      const firstRequest = httpMock.expectOne('/test');
      firstRequest.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      const refreshRequest = httpMock.expectOne('http://localhost:3000/auth/refresh');
      expect(refreshRequest.request.method).toBe('POST');
      refreshRequest.flush({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        tokenType: 'Bearer',
        user: {
          id: 'u-1',
          email: 'admin@test.cl',
          fullName: 'Admin',
          roles: ['admin'],
          permissions: ['USERS_READ'],
        },
      });

      const retriedRequest = httpMock.expectOne('/test');
      expect(retriedRequest.request.headers.get('Authorization')).toBe('Bearer new-access-token');
      retriedRequest.flush({ ok: true });

      expect(logoutSpy).not.toHaveBeenCalled();
    });

    it('should call logout when refresh fails', () => {
      localStorage.setItem('sm_access_token', 'expired-token');
      localStorage.setItem('sm_refresh_token', 'refresh-token');
      const logoutSpy = vi.spyOn(authService, 'logout');

      httpClient.get('/test').subscribe({ error: () => {} });

      const firstRequest = httpMock.expectOne('/test');
      firstRequest.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      const refreshRequest = httpMock.expectOne('http://localhost:3000/auth/refresh');
      refreshRequest.flush(
        { message: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' }
      );

      expect(logoutSpy).toHaveBeenCalled();
    });

    it('should not logout on non-401 errors', () => {
      localStorage.setItem('sm_access_token', 'some-token');
      const logoutSpy = vi.spyOn(authService, 'logout');

      httpClient.get('/test').subscribe({
        error: () => {},
      });

      const req = httpMock.expectOne('/test');
      req.flush({ message: 'Not Found' }, { status: 404, statusText: 'Not Found' });

      expect(logoutSpy).not.toHaveBeenCalled();
    });

    it('should rethrow the error after handling 401', () => {
      localStorage.setItem('sm_access_token', 'expired-token');
      localStorage.setItem('sm_refresh_token', 'refresh-token');

      httpClient.get('/test').subscribe({
        error: (err) => {
          expect(err.status).toBe(401);
        },
      });

      const firstRequest = httpMock.expectOne('/test');
      firstRequest.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      const refreshRequest = httpMock.expectOne('http://localhost:3000/auth/refresh');
      refreshRequest.flush(
        { message: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' }
      );
    });
  });
});
