import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../features/auth/services/auth.service';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

const REFRESH_PATH = '/auth/refresh';

function isAuthRefreshRequest(url: string): boolean {
  return url.includes(REFRESH_PATH);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getAccessToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        if (isAuthRefreshRequest(req.url)) {
          authService.logout();
          void router.navigate(['/auth/login']);
          return throwError(() => error);
        }

        return authService.refresh().pipe(
          switchMap((session) => {
            const retryRequest = req.clone({
              setHeaders: {
                Authorization: `Bearer ${session.accessToken}`,
              },
            });
            return next(retryRequest);
          }),
          catchError((refreshError: unknown) => {
            authService.logout();
            void router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};
