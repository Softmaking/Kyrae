import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { AppTableComponent } from '../../../shared/components/table/app-table.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { FormModalComponent } from '../../../shared/components/form-modal/form-modal.component';
import type {
  AppConfig,
  AppConfigFilters,
  AppConfigValue,
  CreateAppConfigDto,
  UpdateAppConfigDto,
} from '../models/configuration.model';
import { ConfigurationService } from '../services/configuration.service';

type EditableAppConfig = {
  key: string;
  valueText: string;
  description: string;
  category: string;
  isActive: boolean;
};

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppTableComponent,
    ConfirmDialogComponent,
    FormModalComponent,
  ],
  templateUrl: './configuration.component.html',
  styleUrl: './configuration.component.css',
})
export class ConfigurationComponent implements OnInit {
  showCreateModal = signal(false);
  showEditModal = signal(false);
  saving = false;
  readonly editingId = signal<string | null>(null);
  confirmAction = signal<'save' | 'cancel' | null>(null);

  formData: CreateAppConfigDto = {
    key: '',
    value: '',
    description: '',
    category: '',
    isActive: true,
  };
  formValueText = '';
  editFormData: EditableAppConfig | null = null;

  readonly searchTerm = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly selectedCategory = signal('');
  readonly selectedState = signal<'all' | 'active' | 'inactive'>('all');

  constructor(
    readonly configurationService: ConfigurationService,
    readonly authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadConfigs();
  }

  get activeFilters(): AppConfigFilters {
    const filters: AppConfigFilters = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };

    if (this.searchTerm().trim()) {
      filters.search = this.searchTerm().trim();
    }

    if (this.selectedCategory().trim()) {
      filters.category = this.selectedCategory().trim();
    }

    if (this.selectedState() === 'active') {
      filters.isActive = true;
    }

    if (this.selectedState() === 'inactive') {
      filters.isActive = false;
    }

    return filters;
  }

  async loadConfigs(): Promise<void> {
    await this.configurationService.load(this.activeFilters);
  }

  async onSubmit(): Promise<void> {
    const data = this.formData;
    const parsedValue = this.parseValueInput(this.formValueText);
    if (!data.key.trim() || parsedValue === null) return;

    this.saving = true;
    try {
      await this.configurationService.create({
        key: data.key.trim(),
        value: parsedValue,
        description: data.description?.trim() || undefined,
        category: data.category?.trim() || undefined,
        isActive: data.isActive ?? true,
      });

      this.showCreateModal.set(false);
      this.formData = { key: '', value: '', description: '', category: '', isActive: true };
      this.formValueText = '';
      await this.loadConfigs();
    } finally {
      this.saving = false;
    }
  }

  cancelCreate(): void {
    this.showCreateModal.set(false);
    this.formData = { key: '', value: '', description: '', category: '', isActive: true };
    this.formValueText = '';
  }

  startEdit(config: AppConfig): void {
    this.editingId.set(config.id);
    this.editFormData = {
      key: config.key,
      valueText: JSON.stringify(config.value, null, 2),
      description: config.description ?? '',
      category: config.category ?? '',
      isActive: config.isActive,
    };
    this.showEditModal.set(true);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editFormData = null;
    this.showEditModal.set(false);
  }

  requestSave(): void {
    const data = this.editFormData;
    if (!data || !data.key.trim()) return;
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
    const data = this.editFormData;
    if (!id || !data || !data.key.trim()) return;

    const parsedValue = this.parseValueInput(data.valueText);
    if (parsedValue === null) return;

    const updateDto: UpdateAppConfigDto = {
      key: data.key.trim(),
      value: parsedValue,
      description: data.description.trim() || undefined,
      category: data.category.trim() || undefined,
      isActive: data.isActive,
    };

    this.saving = true;
    try {
      await this.configurationService.update(id, updateDto);
      this.cancelEdit();
      await this.loadConfigs();
    } finally {
      this.saving = false;
    }
  }

  async onToggleActive(config: AppConfig): Promise<void> {
    await this.configurationService.update(config.id, { isActive: !config.isActive });
    await this.loadConfigs();
  }

  async onRemove(config: AppConfig): Promise<void> {
    const confirmed = window.confirm(`Eliminar la configuracion ${config.key}?`);
    if (!confirmed) return;
    await this.configurationService.remove(config.id);
    await this.loadConfigs();
  }

  async onSearchChange(value: string): Promise<void> {
    this.searchTerm.set(value);
    this.currentPage.set(1);
    await this.loadConfigs();
  }

  async onPageSizeChange(value: number): Promise<void> {
    this.pageSize.set(value);
    this.currentPage.set(1);
    await this.loadConfigs();
  }

  async goToPage(page: number): Promise<void> {
    this.currentPage.set(page);
    await this.loadConfigs();
  }

  async onCategoryFilterChange(category: string): Promise<void> {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
    await this.loadConfigs();
  }

  async onStateFilterChange(state: 'all' | 'active' | 'inactive'): Promise<void> {
    this.selectedState.set(state);
    this.currentPage.set(1);
    await this.loadConfigs();
  }

  displayValue(value: AppConfigValue): string {
    const serialized = JSON.stringify(value);
    return serialized.length > 70 ? `${serialized.slice(0, 67)}...` : serialized;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  private parseValueInput(valueText: string): AppConfigValue | null {
    const trimmed = valueText.trim();
    if (!trimmed) return '';

    try {
      return JSON.parse(trimmed) as AppConfigValue;
    } catch {
      return trimmed;
    }
  }
}
