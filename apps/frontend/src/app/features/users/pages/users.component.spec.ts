/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { UsersComponent } from './users.component';
import { AuthService } from '../../auth/services/auth.service';
import { BranchesService } from '../../branches/services/branches.service';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { RolesService } from '../../roles/services/roles.service';
import { UsersService } from '../services/users.service';

const mockUsers = [
  {
    id: 'u-1',
    email: 'user1@test.cl',
    firstName: 'User',
    firstSurname: 'One',
    secondSurname: undefined,
    rut: undefined,
    fullName: 'User One',
    isActive: true,
    roles: [{ id: 'r-1', name: 'Admin' }],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'u-2',
    email: 'user2@test.cl',
    firstName: 'User',
    firstSurname: 'Two',
    secondSurname: undefined,
    rut: undefined,
    fullName: 'User Two',
    isActive: false,
    roles: [],
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
];

describe('UsersComponent', () => {
  let fixture: ComponentFixture<UsersComponent>;
  let component: UsersComponent;
  let usersService: UsersService;
  let organizationsService: OrganizationsService;
  let branchesService: BranchesService;

  const mockAuthService = {
    user: signal({
      id: '1',
      email: 'admin@test.cl',
      fullName: 'Admin',
      roles: ['admin'],
      permissions: ['USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE'],
    }),
    hasPermission: (perm: string) =>
      ['USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE'].includes(perm),
  } as AuthService;

  const mockRolesService = {
    roles: signal([
      {
        id: 'r-1',
        name: 'Admin',
        description: null,
        permissions: [{ id: 'p-1', name: 'USERS_READ' }],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ]),
    loadAll: vi.fn().mockResolvedValue(undefined),
  };

  const mockOrganizationsService = {
    organizations: signal([
      {
        id: 'org-1',
        code: 'ORG',
        name: 'Organización',
        description: null,
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ]),
    loadAll: vi.fn().mockResolvedValue(undefined),
    getUsers: vi.fn().mockResolvedValue([]),
    assignUser: vi.fn().mockResolvedValue(undefined),
  };

  const mockBranchesService = {
    branches: signal([
      {
        id: 'branch-1',
        organizationId: 'org-1',
        organization: { id: 'org-1', code: 'ORG', name: 'Organización' },
        code: 'MAIN',
        name: 'Sucursal',
        description: null,
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ]),
    loadAll: vi.fn().mockResolvedValue(undefined),
    getUsers: vi.fn().mockResolvedValue([]),
    assignUser: vi.fn().mockResolvedValue(undefined),
  };

  const mockUsersService = {
    users: signal(mockUsers),
    loading: signal(false),
    loadAll: vi.fn().mockResolvedValue(undefined),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: RolesService, useValue: mockRolesService },
        { provide: OrganizationsService, useValue: mockOrganizationsService },
        { provide: BranchesService, useValue: mockBranchesService },
      ],
    }).compileComponents();

    usersService = TestBed.inject(UsersService);
    organizationsService = TestBed.inject(OrganizationsService);
    branchesService = TestBed.inject(BranchesService);
    usersService.users.set(mockUsers);
    usersService.loading.set(false);
    vi.spyOn(usersService, 'loadAll').mockResolvedValue();

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should display users in table', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('should show "Nuevo usuario" button when has USERS_CREATE permission', () => {
    const button = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('Nuevo usuario');
  });

  it('should filter users by search term', () => {
    component.onSearchChange('User One');
    fixture.detectChanges();
    expect(component.filteredUsers().length).toBe(1);
    expect(component.filteredUsers()[0].email).toBe('user1@test.cl');
  });

  it('should show empty message when no users match filter', () => {
    component.onSearchChange('nonexistent');
    fixture.detectChanges();
    const emptyMessage = fixture.nativeElement.querySelector('.admin-table-empty');
    expect(emptyMessage).toBeDefined();
    expect(emptyMessage.textContent).toContain('No se encontraron usuarios');
  });

  it('should paginate users', () => {
    component.pageSize.set(1);
    fixture.detectChanges();
    expect(component.paginatedUsers().length).toBe(1);
  });

  it('should toggle create modal visibility', () => {
    expect(component.showCreateModal()).toBe(false);
    component.showCreateModal.set(true);
    fixture.detectChanges();
    expect(component.showCreateModal()).toBe(true);
  });

  it('should call usersService.create on submit', async () => {
    const createSpy = vi.spyOn(usersService, 'create').mockResolvedValue(mockUsers[0]);
    component.formData = {
      email: 'new@test.cl',
      firstName: 'New',
      firstSurname: 'User',
      secondSurname: '',
      rut: '',
      password: '12345678',
      roleIds: [],
    };
    await component.onSubmit();
    expect(createSpy).toHaveBeenCalledWith({
      email: 'new@test.cl',
      firstName: 'New',
      firstSurname: 'User',
      secondSurname: '',
      rut: '',
      password: '12345678',
      roleIds: [],
    });
    expect(component.showCreateModal()).toBe(false);
  });

  it('should not submit with empty required fields', async () => {
    const createSpy = vi.spyOn(usersService, 'create');
    createSpy.mockClear();
    component.formData = {
      email: '',
      firstName: '',
      firstSurname: '',
      secondSurname: '',
      rut: '',
      password: '',
      roleIds: [],
    };
    await component.onSubmit();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('should show delete button when has USERS_DELETE permission', () => {
    const deleteButton = fixture.nativeElement.querySelector('.admin-table-action-danger');
    expect(deleteButton).toBeDefined();
  });

  it('should show edit button when has USERS_UPDATE permission', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')).map(
      (button: any) => button.textContent.trim()
    );
    expect(buttons).toContain('Editar');
  });

  it('should update user roles and assign organization before branch', async () => {
    const updateSpy = vi.spyOn(usersService, 'update').mockResolvedValue(mockUsers[0]);
    component.startEdit(mockUsers[0]);
    component.editFormData = {
      email: 'user1@test.cl',
      firstName: 'User',
      firstSurname: 'One',
      secondSurname: '',
      rut: '',
      isActive: true,
      roleIds: ['r-1'],
      organizationId: 'org-1',
      branchId: 'branch-1',
    };

    await component.onUpdate();

    expect(updateSpy).toHaveBeenCalledWith('u-1', {
      email: 'user1@test.cl',
      firstName: 'User',
      firstSurname: 'One',
      secondSurname: '',
      rut: '',
      isActive: true,
      roleIds: ['r-1'],
      password: undefined,
    });
    expect(organizationsService.assignUser).toHaveBeenCalledWith('org-1', 'u-1');
    expect(branchesService.assignUser).toHaveBeenCalledWith('branch-1', 'u-1');
  });
});
