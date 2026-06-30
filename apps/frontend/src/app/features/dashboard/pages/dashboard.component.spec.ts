/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../auth/services/auth.service';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;

  const mockUser = {
    id: '1',
    email: 'admin@test.cl',
    fullName: 'Admin User',
    roles: ['admin', 'editor'],
    permissions: ['USERS_READ', 'ROLES_READ'],
  };

  const mockAuthService = {
    user: signal(mockUser),
  } as AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should display user fullName in welcome message', () => {
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Admin User');
  });

  it('should display user email in session card', () => {
    const emailText = fixture.nativeElement.textContent;
    expect(emailText).toContain('admin@test.cl');
  });

  it('should display role badges for each role', () => {
    const dashboardText = fixture.nativeElement.textContent;
    expect(dashboardText).toContain('admin');
    expect(dashboardText).toContain('editor');
  });

  it('should display permissions count', () => {
    const permissionCard = fixture.nativeElement.querySelectorAll('article')[2];
    expect(permissionCard.textContent).toContain('2');
  });

  it('should display roles count', () => {
    const rolesCards = fixture.nativeElement.querySelectorAll('article')[1];
    expect(rolesCards.textContent).toContain('2');
  });
});
