/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PermissionsComponent } from './permissions.component';
import { AuthService } from '../../auth/services/auth.service';
import { PermissionsService } from '../services/permissions.service';

const mockPermissions = [
  {
    id: 'p-1',
    name: 'USERS_READ',
    description: 'Leer usuarios',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'p-2',
    name: 'USERS_CREATE',
    description: null,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
];

describe('PermissionsComponent', () => {
  let fixture: ComponentFixture<PermissionsComponent>;
  let component: PermissionsComponent;
  let permissionsService: PermissionsService;

  const mockAuthService = {
    user: signal({
      id: '1',
      email: 'admin@test.cl',
      fullName: 'Admin',
      roles: ['admin'],
      permissions: ['PERMISSIONS_CREATE', 'PERMISSIONS_DELETE'],
    }),
    hasPermission: (perm: string) => ['PERMISSIONS_CREATE', 'PERMISSIONS_DELETE'].includes(perm),
  } as AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionsComponent],
      providers: [PermissionsService, { provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();

    permissionsService = TestBed.inject(PermissionsService);
    permissionsService.permissions.set(mockPermissions);
    permissionsService.loading.set(false);
    vi.spyOn(permissionsService, 'loadAll').mockResolvedValue();

    fixture = TestBed.createComponent(PermissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should display permissions in table', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('should show "Nuevo permiso" button when has PERMISSIONS_CREATE permission', () => {
    const button = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('Nuevo permiso');
  });

  it('should filter permissions by search term', () => {
    component.onSearchChange('USERS_READ');
    fixture.detectChanges();
    expect(component.filteredPermissions().length).toBe(1);
    expect(component.filteredPermissions()[0].name).toBe('USERS_READ');
  });

  it('should show empty message when no permissions match filter', () => {
    component.onSearchChange('nonexistent');
    fixture.detectChanges();
    const emptyMessage = fixture.nativeElement.querySelector('.admin-table-empty');
    expect(emptyMessage.textContent).toContain('No se encontraron permisos');
  });

  it('should paginate permissions', () => {
    component.pageSize.set(1);
    fixture.detectChanges();
    expect(component.paginatedPermissions().length).toBe(1);
  });

  it('should call permissionsService.create on submit', async () => {
    const createSpy = vi.spyOn(permissionsService, 'create').mockResolvedValue(mockPermissions[0]);
    component.formData = { name: 'NEW_PERM' };
    await component.onSubmit();
    expect(createSpy).toHaveBeenCalledWith({ name: 'NEW_PERM' });
    expect(component.showCreateModal()).toBe(false);
  });

  it('should not submit with empty name', async () => {
    const createSpy = vi.spyOn(permissionsService, 'create');
    component.formData = { name: '' };
    await component.onSubmit();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('should show delete button when has PERMISSIONS_DELETE permission', () => {
    const deleteButton = fixture.nativeElement.querySelector('.admin-table-action-danger');
    expect(deleteButton).toBeDefined();
  });
});
