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
import { Organization } from '../../organizations/models/organization.model';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { Branch, CreateBranchDto, UpdateBranchDto } from '../models/branch.model';
import { BranchesService } from '../services/branches.service';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppTableComponent,
    UserAssignmentModalComponent,
    ConfirmDialogComponent,
    FormModalComponent,
  ],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.css',
})
export class BranchesComponent implements OnInit {
  showCreateModal = signal(false);
  showEditModal = signal(false);
  saving = false;
  organizations = signal<Organization[]>([]);
  formData: CreateBranchDto = { organizationId: '', code: '', name: '', description: '' };
  editingId = signal<string | null>(null);
  editFormData: UpdateBranchDto = {};
  confirmAction = signal<'save' | 'cancel' | null>(null);
  readonly searchTerm = signal('');
  readonly pageSize = signal(10);
  readonly currentPage = signal(1);
  readonly filteredBranches = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const branches = this.branchService.branches();

    if (!term) return branches;

    return branches.filter((branch) =>
      [
        branch.code,
        branch.name,
        branch.description ?? '',
        branch.organization?.name ?? branch.organizationId,
        branch.isActive ? 'activo' : 'inactivo',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  });
  readonly paginatedBranches = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredBranches().slice(start, start + this.pageSize());
  });

  readonly showUserModal = signal(false);
  readonly userModalBranchId = signal<string | null>(null);
  readonly assignedBranchUsers = signal<AssignableUser[]>([]);

  constructor(
    readonly branchService: BranchesService,
    private readonly orgService: OrganizationsService,
    readonly authService: AuthService,
    readonly usersService: UsersService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.branchService.loadAll();
    await this.orgService.loadAll();
    this.organizations.set(this.orgService.organizations());
  }

  async onSubmit(): Promise<void> {
    if (!this.formData.organizationId || !this.formData.code || !this.formData.name) return;
    this.saving = true;
    try {
      await this.branchService.create(this.formData);
      this.showCreateModal.set(false);
      this.formData = { organizationId: '', code: '', name: '', description: '' };
    } finally {
      this.saving = false;
    }
  }

  cancelCreate(): void {
    this.showCreateModal.set(false);
    this.formData = { organizationId: '', code: '', name: '', description: '' };
  }

  startEdit(branch: Branch): void {
    this.editingId.set(branch.id);
    this.editFormData = {
      code: branch.code,
      name: branch.name,
      description: branch.description ?? '',
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
      await this.branchService.update(id, this.editFormData);
      this.cancelEdit();
    } finally {
      this.saving = false;
    }
  }

  async onToggleActive(branch: Branch): Promise<void> {
    if (branch.isActive) {
      await this.branchService.deactivate(branch.id);
    } else {
      await this.branchService.activate(branch.id);
    }
  }

  async openUserModal(branch: Branch): Promise<void> {
    this.userModalBranchId.set(branch.id);
    await this.usersService.loadAll();
    const users = await this.branchService.getUsers(branch.id);
    this.assignedBranchUsers.set(
      users.map((u) => ({ id: u.id, email: u.email, fullName: u.fullName, isActive: u.isActive }))
    );
    this.showUserModal.set(true);
  }

  async onAddBranchUser(userId: string): Promise<void> {
    const branchId = this.userModalBranchId();
    if (!branchId) return;
    await this.branchService.assignUser(branchId, userId);
    const users = await this.branchService.getUsers(branchId);
    this.assignedBranchUsers.set(
      users.map((u) => ({ id: u.id, email: u.email, fullName: u.fullName, isActive: u.isActive }))
    );
  }

  async onRemoveBranchUser(userId: string): Promise<void> {
    const branchId = this.userModalBranchId();
    if (!branchId) return;
    await this.branchService.removeUser(branchId, userId);
    const users = await this.branchService.getUsers(branchId);
    this.assignedBranchUsers.set(
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
