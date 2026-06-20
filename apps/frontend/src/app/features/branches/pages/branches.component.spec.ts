/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BranchesComponent } from './branches.component';
import { AuthService } from '../../auth/services/auth.service';
import { BranchesService } from '../services/branches.service';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { UsersService } from '../../users/services/users.service';

const mockBranches = [
  {
    id: 'b-1',
    code: 'BR1',
    name: 'Branch One',
    description: 'First branch',
    isActive: true,
    organizationId: 'o-1',
    organization: { id: 'o-1', name: 'Org One', code: 'ORG1' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'b-2',
    code: 'BR2',
    name: 'Branch Two',
    description: null,
    isActive: false,
    organizationId: 'o-1',
    organization: { id: 'o-1', name: 'Org One', code: 'ORG1' },
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
];

const mockOrgs = [
  {
    id: 'o-1',
    code: 'ORG1',
    name: 'Org One',
    description: null,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

describe('BranchesComponent', () => {
  let fixture: ComponentFixture<BranchesComponent>;
  let component: BranchesComponent;
  let branchService: BranchesService;

  const mockAuthService = {
    user: signal({
      id: '1',
      email: 'admin@test.cl',
      firstName: 'Admin',
      firstSurname: 'User',
      fullName: 'Admin',
      roles: ['admin'],
      permissions: ['BRANCHES_CREATE', 'BRANCHES_UPDATE', 'BRANCHES_DELETE'],
    }),
    hasPermission: (perm: string) =>
      ['BRANCHES_CREATE', 'BRANCHES_UPDATE', 'BRANCHES_DELETE'].includes(perm),
  } as AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BranchesComponent],
      providers: [
        BranchesService,
        OrganizationsService,
        UsersService,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    branchService = TestBed.inject(BranchesService);
    branchService.branches.set(mockBranches);
    branchService.loading.set(false);
    vi.spyOn(branchService, 'loadAll').mockResolvedValue();

    const orgService = TestBed.inject(OrganizationsService);
    orgService.organizations.set(mockOrgs);
    vi.spyOn(orgService, 'loadAll').mockResolvedValue();

    fixture = TestBed.createComponent(BranchesComponent);
    component = fixture.componentInstance;
    component.organizations.set(mockOrgs);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should display branches in table', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('should show "Nueva sucursal" button when has BRANCHES_CREATE permission', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const hasCreateButton = Array.from(buttons).some((b) =>
      (b as HTMLButtonElement).textContent?.includes('Nueva sucursal')
    );
    expect(hasCreateButton).toBe(true);
  });

  it('should filter branches by search term', () => {
    component.onSearchChange('Branch One');
    fixture.detectChanges();
    expect(component.filteredBranches().length).toBe(1);
  });

  it('should show empty message when no branches match filter', () => {
    component.onSearchChange('nonexistent');
    fixture.detectChanges();
    const emptyMessage = fixture.nativeElement.querySelector('.admin-table-empty');
    expect(emptyMessage.textContent).toContain('No se encontraron sucursales');
  });

  it('should paginate branches', () => {
    component.pageSize.set(1);
    fixture.detectChanges();
    expect(component.paginatedBranches().length).toBe(1);
  });

  it('should call branchService.create on submit', async () => {
    const createSpy = vi.spyOn(branchService, 'create').mockResolvedValue(mockBranches[0]);
    component.formData = {
      organizationId: 'o-1',
      code: 'NEWBR',
      name: 'New Branch',
      description: '',
    };
    await component.onSubmit();
    expect(createSpy).toHaveBeenCalledWith({
      organizationId: 'o-1',
      code: 'NEWBR',
      name: 'New Branch',
      description: '',
    });
    expect(component.showCreateModal()).toBe(false);
  });

  it('should start edit mode', () => {
    component.startEdit(mockBranches[0]);
    expect(component.editingId()).toBe('b-1');
    expect(component.editFormData.code).toBe('BR1');
  });

  it('should cancel edit mode', () => {
    component.editingId.set('b-1');
    component.cancelEdit();
    expect(component.editingId()).toBeNull();
  });

  it('should call branchService.update on onUpdate', async () => {
    const updateSpy = vi.spyOn(branchService, 'update').mockResolvedValue(mockBranches[0]);
    component.editingId.set('b-1');
    component.editFormData = { code: 'UPDATED', name: 'Updated Branch' };
    await component.onUpdate();
    expect(updateSpy).toHaveBeenCalledWith('b-1', { code: 'UPDATED', name: 'Updated Branch' });
    expect(component.editingId()).toBeNull();
  });

  it('should call activate/deactivate on onToggleActive', async () => {
    const deactivateSpy = vi.spyOn(branchService, 'deactivate').mockResolvedValue();
    await component.onToggleActive(mockBranches[0]);
    expect(deactivateSpy).toHaveBeenCalledWith('b-1');

    const activateSpy = vi.spyOn(branchService, 'activate').mockResolvedValue();
    await component.onToggleActive(mockBranches[1]);
    expect(activateSpy).toHaveBeenCalledWith('b-2');
  });

  it('should format dates correctly', () => {
    const result = component.formatDate('2025-03-15T10:30:00Z');
    expect(result).toContain('2025');
  });
});
