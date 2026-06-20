/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RolesComponent } from './roles.component';
import { AuthService } from '../../auth/services/auth.service';
import { PermissionsService } from '../../permissions/services/permissions.service';
import { RolesService } from '../services/roles.service';

const mockRoles = [
  {
    id: 'r-1',
    name: 'Admin',
    description: null,
    permissions: [{ id: 'p-1', name: 'USERS_READ' }],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'r-2',
    name: 'Viewer',
    description: 'Solo lectura',
    permissions: [],
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
];

describe('RolesComponent', () => {
  let fixture: ComponentFixture<RolesComponent>;
  let component: RolesComponent;
  let rolesService: RolesService;

  const mockAuthService = {
    user: signal({
      id: '1',
      email: 'admin@test.cl',
      fullName: 'Admin',
      roles: ['admin'],
      permissions: ['ROLES_CREATE', 'ROLES_UPDATE', 'ROLES_DELETE'],
    }),
    hasPermission: (perm: string) =>
      ['ROLES_CREATE', 'ROLES_UPDATE', 'ROLES_DELETE'].includes(perm),
  } as AuthService;

  const mockRolesService = {
    roles: signal(mockRoles),
    loading: signal(false),
    loadAll: vi.fn().mockResolvedValue(undefined),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const mockPermissionsService = {
    permissions: signal([
      {
        id: 'p-1',
        name: 'USERS_READ',
        description: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ]),
    loadAll: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesComponent],
      providers: [
        { provide: RolesService, useValue: mockRolesService },
        { provide: PermissionsService, useValue: mockPermissionsService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    rolesService = TestBed.inject(RolesService);
    rolesService.roles.set(mockRoles);
    rolesService.loading.set(false);
    vi.spyOn(rolesService, 'loadAll').mockResolvedValue();

    fixture = TestBed.createComponent(RolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should display roles in table', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('should show "Nuevo rol" button when has ROLES_CREATE permission', () => {
    const button = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('Nuevo rol');
  });

  it('should filter roles by search term', () => {
    component.onSearchChange('Admin');
    fixture.detectChanges();
    expect(component.filteredRoles().length).toBe(1);
    expect(component.filteredRoles()[0].name).toBe('Admin');
  });

  it('should show empty message when no roles match filter', () => {
    component.onSearchChange('nonexistent');
    fixture.detectChanges();
    const emptyMessage = fixture.nativeElement.querySelector('.admin-table-empty');
    expect(emptyMessage.textContent).toContain('No se encontraron roles');
  });

  it('should paginate roles', () => {
    component.pageSize.set(1);
    fixture.detectChanges();
    expect(component.paginatedRoles().length).toBe(1);
  });

  it('should call rolesService.create on submit', async () => {
    const createSpy = vi.spyOn(rolesService, 'create').mockResolvedValue(mockRoles[0]);
    component.formData = { name: 'New Role' };
    await component.onSubmit();
    expect(createSpy).toHaveBeenCalledWith({ name: 'New Role' });
    expect(component.showCreateModal()).toBe(false);
  });

  it('should not submit with empty name', async () => {
    const createSpy = vi.spyOn(rolesService, 'create');
    createSpy.mockClear();
    component.formData = { name: '' };
    await component.onSubmit();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('should show delete button when has ROLES_DELETE permission', () => {
    const deleteButton = fixture.nativeElement.querySelector('.admin-table-action-danger');
    expect(deleteButton).toBeDefined();
  });

  it('should show edit button when has ROLES_UPDATE permission', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')).map(
      (button: any) => button.textContent.trim()
    );
    expect(buttons).toContain('Editar');
  });

  it('should update role permissions', async () => {
    const updateSpy = vi.spyOn(rolesService, 'update').mockResolvedValue(mockRoles[0]);
    component.startEdit(mockRoles[0]);
    component.toggleEditPermission('p-2', true);

    await component.onUpdate();

    expect(updateSpy).toHaveBeenCalledWith('r-1', {
      name: 'Admin',
      description: '',
      permissionIds: ['p-1', 'p-2'],
    });
  });
});
