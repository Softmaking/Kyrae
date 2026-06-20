/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { LoginComponent } from './login.component';
import { AuthService } from '../services/auth.service';

function createMockLoginResponse(handlers?: { next?: () => void; error?: () => void }): {
  subscribe: (h: { next?: () => void; error?: () => void }) => { unsubscribe: () => void };
} {
  if (handlers) {
    return {
      subscribe: (h: { next?: () => void; error?: () => void }) => {
        if (handlers.next && h.next) h.next();
        if (handlers.error && h.error) h.error();
        return { unsubscribe: () => {} };
      },
    };
  }
  return {
    subscribe: () => ({ unsubscribe: () => {} }),
  };
}

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;

  const mockAuthService = {
    user: signal(null),
    login: vi.fn((_email: string, _password: string) => createMockLoginResponse()),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should render login form with email and password fields', () => {
    const emailInput = fixture.nativeElement.querySelector('#email');
    const passwordInput = fixture.nativeElement.querySelector('#password');
    expect(emailInput).toBeDefined();
    expect(passwordInput).toBeDefined();
  });

  it('should mark form as touched on submit when invalid', () => {
    component.form.controls['email'].setValue('');
    component.form.controls['password'].setValue('');
    component.submit();
    expect(component.form.controls['email'].touched).toBe(true);
    expect(component.form.controls['password'].touched).toBe(true);
  });

  it('should show error message when login fails', () => {
    mockAuthService.login.mockReturnValue(createMockLoginResponse({ error: () => {} }));

    component.submit();
    expect(component.error()).toBe('Credenciales inválidas.');
  });

  it('should set loading during submit', () => {
    mockAuthService.login.mockReturnValue(createMockLoginResponse());

    component.submit();
    expect(component.loading()).toBe(true);
  });

  it('should display validation errors when fields are touched and invalid', () => {
    component.form.controls['email'].markAsTouched();
    component.form.controls['email'].setErrors({ email: true });
    component.form.controls['password'].markAsTouched();
    component.form.controls['password'].setErrors({ minlength: true });
    fixture.detectChanges();

    const errorTexts = fixture.nativeElement.querySelectorAll('.text-red-700');
    expect(errorTexts.length).toBeGreaterThan(0);
  });

  it('should toggle menuOpen', () => {
    expect(component.menuOpen()).toBe(false);
    component.toggleMenu();
    expect(component.menuOpen()).toBe(true);
    component.toggleMenu();
    expect(component.menuOpen()).toBe(false);
  });

  it('should close menu on closeMenu', () => {
    component.menuOpen.set(true);
    component.closeMenu();
    expect(component.menuOpen()).toBe(false);
  });
});
