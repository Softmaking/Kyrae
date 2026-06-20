import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { AppTableComponent } from '../../../shared/components/table/app-table.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { FormModalComponent } from '../../../shared/components/form-modal/form-modal.component';
import type { Permission } from '../../permissions/models/permission.model';
import { PermissionsService } from '../../permissions/services/permissions.service';
import type { CreateRoleDto, Role, UpdateRoleDto } from '../models/role.model';
import { RolesService } from '../services/roles.service';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppTableComponent,
    ConfirmDialogComponent,
    FormModalComponent,
  ],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.css',
})
export class RolesComponent implements OnInit {
  showCreateModal = signal(false);
  showEditModal = signal(false);
  saving = false;
  formData: CreateRoleDto = { name: '', description: '', permissionIds: [] };
  editingId = signal<string | null>(null);
  editFormData: UpdateRoleDto = {};
  confirmAction = signal<'save' | 'cancel' | null>(null);
  readonly permissions = signal<Permission[]>([]);
  readonly searchTerm = signal('');
  readonly pageSize = signal(10);
  readonly currentPage = signal(1);
  readonly filteredRoles = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const roles = this.rolesService.roles();

    if (!term) return roles;

    return roles.filter((r) =>
      [r.name, r.description ?? ''].join(' ').toLowerCase().includes(term)
    );
  });
  readonly paginatedRoles = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredRoles().slice(start, start + this.pageSize());
  });

  constructor(
    readonly rolesService: RolesService,
    readonly authService: AuthService,
    private readonly permissionsService: PermissionsService
  ) {}

  async ngOnInit(): Promise<void> {
    await Promise.all([this.rolesService.loadAll(), this.permissionsService.loadAll()]);
    this.permissions.set(this.permissionsService.permissions());
  }

  async onSubmit(): Promise<void> {
    if (!this.formData.name) return;
    this.saving = true;
    try {
      await this.rolesService.create(this.formData);
      this.showCreateModal.set(false);
      this.formData = { name: '', description: '', permissionIds: [] };
    } finally {
      this.saving = false;
    }
  }

  cancelCreate(): void {
    this.showCreateModal.set(false);
    this.formData = { name: '', description: '', permissionIds: [] };
  }

  startEdit(role: Role): void {
    this.editingId.set(role.id);
    this.editFormData = {
      name: role.name,
      description: role.description ?? '',
      permissionIds: role.permissions.map((permission) => permission.id),
    };
    this.showEditModal.set(true);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editFormData = {};
    this.showEditModal.set(false);
  }

  requestSave(): void {
    if (!this.editFormData.name) return;
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
    const id = this.editingId();
    if (!id || !this.editFormData.name) return;

    this.saving = true;
    try {
      await this.rolesService.update(id, this.editFormData);
      this.cancelEdit();
    } finally {
      this.saving = false;
    }
  }

  toggleCreatePermission(permissionId: string, checked: boolean): void {
    this.formData.permissionIds = this.toggleId(
      this.formData.permissionIds ?? [],
      permissionId,
      checked
    );
  }

  toggleEditPermission(permissionId: string, checked: boolean): void {
    this.editFormData.permissionIds = this.toggleId(
      this.editFormData.permissionIds ?? [],
      permissionId,
      checked
    );
  }

  isCreatePermissionSelected(permissionId: string): boolean {
    return this.formData.permissionIds?.includes(permissionId) ?? false;
  }

  isEditPermissionSelected(permissionId: string): boolean {
    return this.editFormData.permissionIds?.includes(permissionId) ?? false;
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
