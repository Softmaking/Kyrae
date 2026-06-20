import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { AppTableComponent } from '../../../shared/components/table/app-table.component';
import { FormModalComponent } from '../../../shared/components/form-modal/form-modal.component';
import type { CreatePermissionDto } from '../models/permission.model';
import { PermissionsService } from '../services/permissions.service';

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, AppTableComponent, FormModalComponent],
  templateUrl: './permissions.component.html',
  styleUrl: './permissions.component.css',
})
export class PermissionsComponent implements OnInit {
  showCreateModal = signal(false);
  saving = false;
  formData: CreatePermissionDto = { name: '' };
  readonly searchTerm = signal('');
  readonly pageSize = signal(10);
  readonly currentPage = signal(1);
  readonly filteredPermissions = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const permissions = this.permissionsService.permissions();

    if (!term) return permissions;

    return permissions.filter((p) =>
      [p.name, p.description ?? ''].join(' ').toLowerCase().includes(term)
    );
  });
  readonly paginatedPermissions = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredPermissions().slice(start, start + this.pageSize());
  });

  constructor(
    readonly permissionsService: PermissionsService,
    readonly authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.permissionsService.loadAll();
  }

  async onSubmit(): Promise<void> {
    if (!this.formData.name) return;
    this.saving = true;
    try {
      await this.permissionsService.create(this.formData);
      this.showCreateModal.set(false);
      this.formData = { name: '' };
    } finally {
      this.saving = false;
    }
  }

  cancelCreate(): void {
    this.showCreateModal.set(false);
    this.formData = { name: '' };
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
