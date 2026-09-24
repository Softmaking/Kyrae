import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { AppTableComponent } from '../../../shared/components/table/app-table.component';
import { FormModalComponent } from '../../../shared/components/form-modal/form-modal.component';
import type { NotifyMode } from '@kyrae/shared-contracts';
import type { AutomationSchedule } from '../models/automation-schedules.model';
import { AutomationSchedulesService } from '../services/automation-schedules.service';

type ScheduleForm = {
  automationKey: string;
  title: string;
  instruction: string;
  cronExpression: string;
  isActive: boolean;
  notifyMode: NotifyMode;
};

const CRON_PRESETS = [
  { label: 'Cada 5 minutos', value: '*/5 * * * *' },
  { label: 'Cada 10 minutos', value: '*/10 * * * *' },
  { label: 'Cada 30 minutos', value: '*/30 * * * *' },
  { label: 'Cada 1 hora', value: '0 * * * *' },
  { label: 'Cada 6 horas', value: '0 */6 * * *' },
  { label: 'Cada dia (8:00)', value: '0 8 * * *' },
  { label: 'Cada semana (lun 9:00)', value: '0 9 * * 1' },
  { label: 'Personalizado', value: '' },
] as const;

@Component({
  selector: 'app-automation-schedules',
  standalone: true,
  imports: [CommonModule, FormsModule, AppTableComponent, FormModalComponent],
  templateUrl: './automation-schedules.component.html',
  styleUrl: './automation-schedules.component.css',
})
export class AutomationSchedulesComponent implements OnInit {
  readonly cronPresets = CRON_PRESETS;

  showCreateModal = signal(false);
  showEditModal = signal(false);
  saving = false;
  readonly editingId = signal<string | null>(null);

  formData: ScheduleForm = {
    automationKey: '',
    title: '',
    instruction: '',
    cronExpression: '',
    isActive: true,
    notifyMode: 'always',
  };
  editFormData: ScheduleForm | null = null;
  selectedCronPreset = signal('');

  readonly searchTerm = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly selectedState = signal<'all' | 'active' | 'inactive'>('all');

  constructor(
    readonly service: AutomationSchedulesService,
    readonly authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadSchedules();
  }

  get activeFilters() {
    const filters: Record<string, unknown> = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };

    if (this.searchTerm().trim()) {
      filters['search'] = this.searchTerm().trim();
    }

    if (this.selectedState() === 'active') {
      filters['isActive'] = true;
    }

    if (this.selectedState() === 'inactive') {
      filters['isActive'] = false;
    }

    return filters;
  }

  async loadSchedules(): Promise<void> {
    await this.service.load(this.activeFilters);
  }

  onCronPresetChange(presetValue: string): void {
    this.selectedCronPreset.set(presetValue);
    if (presetValue) {
      this.formData.cronExpression = presetValue;
    }
  }

  onRawCronChange(): void {
    const matched = CRON_PRESETS.find((p) => p.value === this.formData.cronExpression);
    this.selectedCronPreset.set(matched ? matched.value : '');
  }

  async onSubmit(): Promise<void> {
    const data = this.formData;
    if (
      !data.automationKey.trim() ||
      !data.title.trim() ||
      !data.instruction.trim() ||
      !data.cronExpression.trim()
    )
      return;

    this.saving = true;
    try {
      await this.service.create({
        automationKey: data.automationKey.trim(),
        title: data.title.trim(),
        instruction: data.instruction.trim(),
        cronExpression: data.cronExpression.trim(),
        isActive: data.isActive,
        notifyMode: data.notifyMode,
      });

      this.showCreateModal.set(false);
      this.formData = {
        automationKey: '',
        title: '',
        instruction: '',
        cronExpression: '',
        isActive: true,
        notifyMode: 'always',
      };
      this.selectedCronPreset.set('');
      await this.loadSchedules();
    } finally {
      this.saving = false;
    }
  }

  cancelCreate(): void {
    this.showCreateModal.set(false);
    this.formData = {
      automationKey: '',
      title: '',
      instruction: '',
      cronExpression: '',
      isActive: true,
      notifyMode: 'always',
    };
    this.selectedCronPreset.set('');
  }

  startEdit(schedule: AutomationSchedule): void {
    this.editingId.set(schedule.id);
    this.editFormData = {
      automationKey: schedule.automationKey,
      title: schedule.title,
      instruction: schedule.instruction,
      cronExpression: schedule.cronExpression,
      isActive: schedule.isActive,
      notifyMode: schedule.notifyMode,
    };
    this.selectedCronPreset.set('');
    this.showEditModal.set(true);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editFormData = null;
    this.showEditModal.set(false);
  }

  onEditCronPresetChange(presetValue: string): void {
    if (presetValue && this.editFormData) {
      this.editFormData.cronExpression = presetValue;
    }
  }

  async onUpdate(): Promise<void> {
    const id = this.editingId();
    const data = this.editFormData;
    if (
      !id ||
      !data ||
      !data.automationKey.trim() ||
      !data.title.trim() ||
      !data.instruction.trim() ||
      !data.cronExpression.trim()
    )
      return;

    this.saving = true;
    try {
      await this.service.update(id, {
        automationKey: data.automationKey.trim(),
        title: data.title.trim(),
        instruction: data.instruction.trim(),
        cronExpression: data.cronExpression.trim(),
        isActive: data.isActive,
        notifyMode: data.notifyMode,
      });
      this.cancelEdit();
      await this.loadSchedules();
    } finally {
      this.saving = false;
    }
  }

  async onToggleActive(schedule: AutomationSchedule): Promise<void> {
    await this.service.update(schedule.id, { isActive: !schedule.isActive });
    await this.loadSchedules();
  }

  async onRemove(schedule: AutomationSchedule): Promise<void> {
    const confirmed = window.confirm(`Eliminar la automatizacion "${schedule.title}"?`);
    if (!confirmed) return;
    await this.service.remove(schedule.id);
    await this.loadSchedules();
  }

  async onSearchChange(value: string): Promise<void> {
    this.searchTerm.set(value);
    this.currentPage.set(1);
    await this.loadSchedules();
  }

  async onPageSizeChange(value: number): Promise<void> {
    this.pageSize.set(value);
    this.currentPage.set(1);
    await this.loadSchedules();
  }

  async goToPage(page: number): Promise<void> {
    this.currentPage.set(page);
    await this.loadSchedules();
  }

  async onStateFilterChange(state: 'all' | 'active' | 'inactive'): Promise<void> {
    this.selectedState.set(state);
    this.currentPage.set(1);
    await this.loadSchedules();
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
