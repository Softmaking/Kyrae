import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { AppTableComponent } from '../../../shared/components/table/app-table.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { FormModalComponent } from '../../../shared/components/form-modal/form-modal.component';
import {
  UserAssignmentModalComponent,
  type AssignableUser,
} from '../../../shared/components/user-assignment-modal/user-assignment-modal.component';
import { UsersService } from '../../users/services/users.service';
import {
  CreateOrganizationDto,
  Organization,
  UpdateOrganizationDto,
} from '../models/organization.model';
import { OrganizationsService } from '../services/organizations.service';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppTableComponent,
    UserAssignmentModalComponent,
    ConfirmDialogComponent,
    FormModalComponent,
  ],
  templateUrl: './organizations.component.html',
  styleUrl: './organizations.component.css',
})
export class OrganizationsComponent implements OnInit {
  showCreateModal = signal(false);
  showEditModal = signal(false);
  saving = false;
  formData: CreateOrganizationDto = { code: '', name: '', description: '' };
  editingId = signal<string | null>(null);
  editFormData: UpdateOrganizationDto = {};
  confirmAction = signal<'save' | 'cancel' | null>(null);
  readonly searchTerm = signal('');
  readonly pageSize = signal(10);
  readonly currentPage = signal(1);
  readonly filteredOrganizations = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const organizations = this.orgService.organizations();

    if (!term) return organizations;

    return organizations.filter((org) =>
      [org.code, org.name, org.description ?? '', org.isActive ? 'activo' : 'inactivo']
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  });
  readonly paginatedOrganizations = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredOrganizations().slice(start, start + this.pageSize());
  });

  readonly showUserModal = signal(false);
  readonly userModalOrgId = signal<string | null>(null);
  readonly assignedOrgUsers = signal<AssignableUser[]>([]);

  constructor(
    readonly orgService: OrganizationsService,
    readonly authService: AuthService,
    readonly usersService: UsersService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.orgService.loadAll();
  }

  async onSubmit(): Promise<void> {
    if (!this.formData.code || !this.formData.name) return;
    this.saving = true;
    try {
      await this.orgService.create(this.formData);
      this.showCreateModal.set(false);
      this.formData = { code: '', name: '', description: '' };
    } finally {
      this.saving = false;
    }
  }

  cancelCreate(): void {
    this.showCreateModal.set(false);
    this.formData = { code: '', name: '', description: '' };
  }

  startEdit(org: Organization): void {
    this.editingId.set(org.id);
    this.editFormData = {
      code: org.code,
      name: org.name,
      description: org.description ?? '',
    };
    this.showEditModal.set(true);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editFormData = {};
    this.showEditModal.set(false);
  }

  requestSave(): void {
    if (!this.editFormData.code || !this.editFormData.name) return;
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
    if (!id || !this.editFormData.code || !this.editFormData.name) return;
    this.saving = true;
    try {
      await this.orgService.update(id, this.editFormData);
      this.cancelEdit();
    } finally {
      this.saving = false;
    }
  }

  async onToggleActive(org: Organization): Promise<void> {
    if (org.isActive) {
      await this.orgService.deactivate(org.id);
    } else {
      await this.orgService.activate(org.id);
    }
  }

  async openUserModal(org: Organization): Promise<void> {
    this.userModalOrgId.set(org.id);
    await this.usersService.loadAll();
    const users = await this.orgService.getUsers(org.id);
    this.assignedOrgUsers.set(
      users.map((u) => ({ id: u.id, email: u.email, fullName: u.fullName, isActive: u.isActive }))
    );
    this.showUserModal.set(true);
  }

  async onAddOrgUser(userId: string): Promise<void> {
    const orgId = this.userModalOrgId();
    if (!orgId) return;
    await this.orgService.assignUser(orgId, userId);
    const users = await this.orgService.getUsers(orgId);
    this.assignedOrgUsers.set(
      users.map((u) => ({ id: u.id, email: u.email, fullName: u.fullName, isActive: u.isActive }))
    );
  }

  async onRemoveOrgUser(userId: string): Promise<void> {
    const orgId = this.userModalOrgId();
    if (!orgId) return;
    await this.orgService.removeUser(orgId, userId);
    const users = await this.orgService.getUsers(orgId);
    this.assignedOrgUsers.set(
      users.map((u) => ({ id: u.id, email: u.email, fullName: u.fullName, isActive: u.isActive }))
    );
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
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
