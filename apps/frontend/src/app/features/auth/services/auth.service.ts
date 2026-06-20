import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom, of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../../../core/config/api.config';
import { LoginResponse, UserProfile } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiBaseUrl = API_BASE_URL;
  private readonly accessTokenKey = 'sm_access_token';
  private readonly refreshTokenKey = 'sm_refresh_token';
  private readonly userKey = 'sm_user';

  readonly isAuthenticated = signal<boolean>(this.readToken() !== null);
  readonly user = signal<UserProfile | null>(this.readUser());

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/auth/login`, { email, password }).pipe(
      tap((response) => {
        this.setSession(response.accessToken, response.refreshToken, response.user);
      })
    );
  }

  refresh() {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    return this.http
      .post<LoginResponse>(`${this.apiBaseUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((response) =>
          this.setSession(response.accessToken, response.refreshToken, response.user)
        )
      );
  }

  getProfile() {
    return this.http
      .get<UserProfile>(`${this.apiBaseUrl}/auth/me`)
      .pipe(tap((profile) => this.setSessionStateOnly(profile)));
  }

  logoutRemote() {
    return this.http.post<void>(`${this.apiBaseUrl}/auth/logout`, {}).pipe(
      catchError(() => of(undefined)),
      tap(() => this.clearSession())
    );
  }

  async bootstrapSession(): Promise<void> {
    if (!this.getAccessToken()) {
      this.clearSession();
      return;
    }

    await firstValueFrom(
      this.getProfile().pipe(
        catchError(() => {
          this.clearSession();
          return of(null);
        })
      )
    );
  }

  logout(): void {
    this.clearSession();
  }

  getAccessToken(): string | null {
    return this.readToken();
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  hasPermission(permission: string): boolean {
    return this.user()?.permissions.includes(permission) ?? false;
  }

  hasRole(role: string): boolean {
    return this.user()?.roles.includes(role) ?? false;
  }

  private setSession(accessToken: string, refreshToken: string, userProfile: UserProfile): void {
    localStorage.setItem(this.accessTokenKey, accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
    localStorage.setItem(this.userKey, JSON.stringify(userProfile));
    this.setSessionStateOnly(userProfile);
  }

  private setSessionStateOnly(userProfile: UserProfile): void {
    this.isAuthenticated.set(true);
    this.user.set(userProfile);
  }

  private clearSession(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    this.isAuthenticated.set(false);
    this.user.set(null);
  }

  private readToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  private readUser(): UserProfile | null {
    const stored = localStorage.getItem(this.userKey);
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored) as Partial<UserProfile>;
      if (
        typeof parsed.id === 'string' &&
        typeof parsed.email === 'string' &&
        typeof parsed.fullName === 'string' &&
        Array.isArray(parsed.roles) &&
        Array.isArray(parsed.permissions)
      ) {
        return parsed as UserProfile;
      }
    } catch {
      localStorage.removeItem(this.userKey);
    }

    return null;
  }
}
