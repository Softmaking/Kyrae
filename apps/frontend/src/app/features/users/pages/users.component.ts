import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { AppTableComponent } from '../../../shared/components/table/app-table.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { FormModalComponent } from '../../../shared/components/form-modal/form-modal.component';
import type { Branch } from '../../branches/models/branch.model';
import { BranchesService } from '../../branches/services/branches.service';
import type { Organization } from '../../organizations/models/organization.model';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import type { Role } from '../../roles/models/role.model';
import { RolesService } from '../../roles/services/roles.service';
import type { CreateUserDto, UpdateUserDto, User } from '../models/user.model';
import { UsersService } from '../services/users.service';

interface UserEditForm extends UpdateUserDto {
  firstName?: string;
  firstSurname?: string;
  secondSurname?: string;
  rut?: string;
  organizationId?: string;
  branchId?: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppTableComponent,
    ConfirmDialogComponent,
    FormModalComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  showCreateModal = signal(false);
  showEditModal = signal(false);
  saving = false;
  formData: CreateUserDto = {
    email: '',
    firstName: '',
    firstSurname: '',
    secondSurname: '',
    rut: undefined,
    password: '',
    roleIds: [],
  };
  editingId = signal<string | null>(null);
  editFormData: UserEditForm = {};
  confirmAction = signal<'save' | 'cancel' | null>(null);
  readonly roles = signal<Role[]>([]);
  readonly organizations = signal<Organization[]>([]);
  readonly branches = signal<Branch[]>([]);
  private readonly userOrgMap = new Map<string, string>();
  private readonly userBranchMap = new Map<string, string>();
  readonly searchTerm = signal('');
  readonly pageSize = signal(10);
  readonly currentPage = signal(1);
  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const users = this.usersService.users();

    if (!term) return users;

    return users.filter((u) =>
      [
        u.email,
        u.firstName,
        u.firstSurname,
        u.secondSurname ?? '',
        u.rut ?? '',
        u.fullName,
        u.isActive ? 'activo' : 'inactivo',
        ...u.roles.map((r) => r.name),
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  });
  readonly paginatedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  constructor(
    readonly usersService: UsersService,
    readonly authService: AuthService,
    private readonly rolesService: RolesService,
    private readonly organizationsService: OrganizationsService,
    private readonly branchesService: BranchesService
  ) {}

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.usersService.loadAll(),
      this.rolesService.loadAll(),
      this.organizationsService.loadAll(),
      this.branchesService.loadAll(),
    ]);
    this.roles.set(this.rolesService.roles());
    this.organizations.set(this.organizationsService.organizations());
    this.branches.set(this.branchesService.branches());
    await this.loadUserScopeMaps();
  }

  async onSubmit(): Promise<void> {
    if (
      !this.formData.email ||
      !this.formData.firstName ||
      !this.formData.firstSurname ||
      !this.formData.password
    )
      return;
    this.saving = true;
    try {
      await this.usersService.create(this.formData);
      this.showCreateModal.set(false);
      this.formData = {
        email: '',
        firstName: '',
        firstSurname: '',
        secondSurname: '',
        rut: undefined,
        password: '',
        roleIds: [],
      };
    } finally {
      this.saving = false;
    }
  }

  cancelCreate(): void {
    this.showCreateModal.set(false);
    this.formData = {
      email: '',
      firstName: '',
      firstSurname: '',
      secondSurname: '',
      rut: undefined,
      password: '',
      roleIds: [],
    };
  }

  startEdit(user: User): void {
    this.editingId.set(user.id);
    this.editFormData = {
      email: user.email,
      firstName: user.firstName,
      firstSurname: user.firstSurname,
      secondSurname: user.secondSurname ?? '',
      rut: user.rut ?? undefined,
      isActive: user.isActive,
      password: '',
      roleIds: user.roles.map((role) => role.id),
      organizationId: this.userOrgMap.get(user.id) ?? '',
      branchId: this.userBranchMap.get(user.id) ?? '',
    };
    this.showEditModal.set(true);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editFormData = {};
    this.showEditModal.set(false);
  }

  requestSave(): void {
    if (!this.editFormData.email || !this.editFormData.firstName || !this.editFormData.firstSurname)
      return;
    this.confirmAction.set('save');
  }

  requestCancelEdit(): void {
    this.confirmAction.set('cancel');
  }

  async handleConfirm(): Promise<void> {
    if (this.confirmAction() === 'save') {
      await this.onUpdate();
    } else if (this.confirmAction() === 'cancel') {
      this.cancelEdit();
    }
    this.confirmAction.set(null);
  }

  handleDismiss(): void {
    this.confirmAction.set(null);
  }

  async onUpdate(): Promise<void> {
    const userId = this.editingId();
    if (
      !userId ||
      !this.editFormData.email ||
      !this.editFormData.firstName ||
      !this.editFormData.firstSurname
    )
      return;

    this.saving = true;
    try {
      const { organizationId, branchId, password, ...userDto } = this.editFormData;
      await this.usersService.update(userId, {
        ...userDto,
        password: password || undefined,
      });
      await this.assignScope(userId, organizationId, branchId);
      this.cancelEdit();
    } finally {
      this.saving = false;
    }
  }

  toggleCreateRole(roleId: string, checked: boolean): void {
    this.formData.roleIds = this.toggleId(this.formData.roleIds ?? [], roleId, checked);
  }

  toggleEditRole(roleId: string, checked: boolean): void {
    this.editFormData.roleIds = this.toggleId(this.editFormData.roleIds ?? [], roleId, checked);
  }

  isCreateRoleSelected(roleId: string): boolean {
    return this.formData.roleIds?.includes(roleId) ?? false;
  }

  isEditRoleSelected(roleId: string): boolean {
    return this.editFormData.roleIds?.includes(roleId) ?? false;
  }

  branchesForEdit(): Branch[] {
    const organizationId = this.editFormData.organizationId;
    if (!organizationId) return this.branches();
    return this.branches().filter((branch) => branch.organizationId === organizationId);
  }

  effectivePermissionsFor(user: User): string[] {
    const selectedRoleIds =
      this.editingId() === user.id
        ? (this.editFormData.roleIds ?? [])
        : user.roles.map((role) => role.id);
    const permissionNames = selectedRoleIds.flatMap(
      (roleId) =>
        this.roles()
          .find((role) => role.id === roleId)
          ?.permissions.map((p) => p.name) ?? []
    );
    return [...new Set(permissionNames)].sort();
  }

  effectiveEditPermissions(): string[] {
    const selectedRoleIds = this.editFormData.roleIds ?? [];
    const permissionNames = selectedRoleIds.flatMap(
      (roleId) =>
        this.roles()
          .find((role) => role.id === roleId)
          ?.permissions.map((p) => p.name) ?? []
    );
    return [...new Set(permissionNames)].sort();
  }

  private async loadUserScopeMaps(): Promise<void> {
    this.userOrgMap.clear();
    this.userBranchMap.clear();

    const orgEntries = await Promise.all(
      this.organizations().map(async (org) => ({
        orgId: org.id,
        users: await this.organizationsService.getUsers(org.id),
      }))
    );
    for (const { orgId, users } of orgEntries) {
      for (const user of users) {
        this.userOrgMap.set(user.id, orgId);
      }
    }

    const branchEntries = await Promise.all(
      this.branches().map(async (branch) => ({
        branchId: branch.id,
        users: await this.branchesService.getUsers(branch.id),
      }))
    );
    for (const { branchId, users } of branchEntries) {
      for (const user of users) {
        this.userBranchMap.set(user.id, branchId);
      }
    }
  }

  private async assignScope(
    userId: string,
    organizationId?: string,
    branchId?: string
  ): Promise<void> {
    const branch = branchId ? this.branches().find((item) => item.id === branchId) : undefined;
    const targetOrganizationId = organizationId || branch?.organizationId;

    if (targetOrganizationId) {
      const orgUsers = await this.organizationsService.getUsers(targetOrganizationId);
      if (!orgUsers.some((user) => user.id === userId)) {
        await this.organizationsService.assignUser(targetOrganizationId, userId);
      }
    }

    if (branchId) {
      const branchUsers = await this.branchesService.getUsers(branchId);
      if (!branchUsers.some((user) => user.id === userId)) {
        await this.branchesService.assignUser(branchId, userId);
      }
    }
  }

  private toggleId(ids: string[], id: string, checked: boolean): string[] {
    if (checked) {
      return ids.includes(id) ? ids : [...ids, id];
    }
    return ids.filter((item) => item !== id);
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  onPageSizeChange(value: number): void {
    this.pageSize.set(value);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }
}
