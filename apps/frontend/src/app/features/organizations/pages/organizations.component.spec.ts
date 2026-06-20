/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { OrganizationsComponent } from './organizations.component';
import { AuthService } from '../../auth/services/auth.service';
import { OrganizationsService } from '../services/organizations.service';
import { UsersService } from '../../users/services/users.service';

const mockOrgs = [
  {
    id: 'o-1',
    code: 'ORG1',
    name: 'Org One',
    description: 'First org',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'o-2',
    code: 'ORG2',
    name: 'Org Two',
    description: null,
    isActive: false,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
];

describe('OrganizationsComponent', () => {
  let fixture: ComponentFixture<OrganizationsComponent>;
  let component: OrganizationsComponent;
  let orgService: OrganizationsService;

  const mockAuthService = {
    user: signal({
      id: '1',
      email: 'admin@test.cl',
      fullName: 'Admin',
      roles: ['admin'],
      permissions: ['ORGANIZATIONS_CREATE', 'ORGANIZATIONS_UPDATE', 'ORGANIZATIONS_DELETE'],
    }),
    hasPermission: (perm: string) =>
      ['ORGANIZATIONS_CREATE', 'ORGANIZATIONS_UPDATE', 'ORGANIZATIONS_DELETE'].includes(perm),
  } as AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationsComponent],
      providers: [
        OrganizationsService,
        UsersService,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    orgService = TestBed.inject(OrganizationsService);
    orgService.organizations.set(mockOrgs);
    orgService.loading.set(false);
    vi.spyOn(orgService, 'loadAll').mockResolvedValue();

    fixture = TestBed.createComponent(OrganizationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should display organizations in table', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('should show "Nueva organización" button when has ORGANIZATIONS_CREATE permission', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const hasCreateButton = Array.from(buttons).some((b) =>
      (b as HTMLButtonElement).textContent?.includes('Nueva organización')
    );
    expect(hasCreateButton).toBe(true);
  });

  it('should filter organizations by search term', () => {
    component.onSearchChange('Org One');
    fixture.detectChanges();
    expect(component.filteredOrganizations().length).toBe(1);
  });

  it('should show empty message when no organizations match filter', () => {
    component.onSearchChange('nonexistent');
    fixture.detectChanges();
    const emptyMessage = fixture.nativeElement.querySelector('.admin-table-empty');
    expect(emptyMessage.textContent).toContain('No se encontraron organizaciones');
  });

  it('should paginate organizations', () => {
    component.pageSize.set(1);
    fixture.detectChanges();
    expect(component.paginatedOrganizations().length).toBe(1);
  });

  it('should call orgService.create on submit', async () => {
    const createSpy = vi.spyOn(orgService, 'create').mockResolvedValue(mockOrgs[0]);
    component.formData = { code: 'NEWORG', name: 'New Org', description: '' };
    await component.onSubmit();
    expect(createSpy).toHaveBeenCalledWith({ code: 'NEWORG', name: 'New Org', description: '' });
    expect(component.showCreateModal()).toBe(false);
  });

  it('should not submit with empty code', async () => {
    const createSpy = vi.spyOn(orgService, 'create');
    component.formData = { code: '', name: '', description: '' };
    await component.onSubmit();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('should start edit mode', () => {
    component.startEdit(mockOrgs[0]);
    expect(component.editingId()).toBe('o-1');
    expect(component.editFormData.code).toBe('ORG1');
  });

  it('should cancel edit mode', () => {
    component.editingId.set('o-1');
    component.cancelEdit();
    expect(component.editingId()).toBeNull();
  });

  it('should call orgService.update on onUpdate', async () => {
    const updateSpy = vi.spyOn(orgService, 'update').mockResolvedValue(mockOrgs[0]);
    component.editingId.set('o-1');
    component.editFormData = { code: 'UPDATED', name: 'Updated Org' };
    await component.onUpdate();
    expect(updateSpy).toHaveBeenCalledWith('o-1', { code: 'UPDATED', name: 'Updated Org' });
    expect(component.editingId()).toBeNull();
  });

  it('should call activate/deactivate on onToggleActive', async () => {
    const deactivateSpy = vi.spyOn(orgService, 'deactivate').mockResolvedValue();
    await component.onToggleActive(mockOrgs[0]);
    expect(deactivateSpy).toHaveBeenCalledWith('o-1');

    const activateSpy = vi.spyOn(orgService, 'activate').mockResolvedValue();
    await component.onToggleActive(mockOrgs[1]);
    expect(activateSpy).toHaveBeenCalledWith('o-2');
  });

  it('should format dates correctly', () => {
    const result = component.formatDate('2025-03-15T10:30:00Z');
    expect(result).toContain('2025');
  });
});
