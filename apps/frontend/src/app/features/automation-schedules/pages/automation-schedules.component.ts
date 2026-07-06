import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { AppTableComponent } from '../../../shared/components/table/app-table.component';
import { FormModalComponent } from '../../../shared/components/form-modal/form-modal.component';
import type { AutomationSchedule } from '../models/automation-schedules.model';
import { AutomationSchedulesService } from '../services/automation-schedules.service';

type ScheduleForm = {
  userId: string;
  automationKey: string;
  title: string;
  instruction: string;
  cronExpression: string;
  isActive: boolean;
};

@Component({
  selector: 'app-automation-schedules',
  standalone: true,
  imports: [CommonModule, FormsModule, AppTableComponent, FormModalComponent],
  templateUrl: './automation-schedules.component.html',
  styleUrl: './automation-schedules.component.css',
})
export class AutomationSchedulesComponent implements OnInit {
  showCreateModal = signal(false);
  showEditModal = signal(false);
  saving = false;
  readonly editingId = signal<string | null>(null);

  formData: ScheduleForm = {
    userId: '',
    automationKey: '',
    title: '',
    instruction: '',
    cronExpression: '',
    isActive: true,
  };
  editFormData: ScheduleForm | null = null;

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

  async onSubmit(): Promise<void> {
    const data = this.formData;
    if (
      !data.userId.trim() ||
      !data.automationKey.trim() ||
      !data.title.trim() ||
      !data.instruction.trim() ||
      !data.cronExpression.trim()
    )
      return;

    this.saving = true;
    try {
      await this.service.create({
        userId: data.userId.trim(),
        automationKey: data.automationKey.trim(),
        title: data.title.trim(),
        instruction: data.instruction.trim(),
        cronExpression: data.cronExpression.trim(),
        isActive: data.isActive,
      });

      this.showCreateModal.set(false);
      this.formData = {
        userId: '',
        automationKey: '',
        title: '',
        instruction: '',
        cronExpression: '',
        isActive: true,
      };
      await this.loadSchedules();
    } finally {
      this.saving = false;
    }
  }

  cancelCreate(): void {
    this.showCreateModal.set(false);
    this.formData = {
      userId: '',
      automationKey: '',
      title: '',
      instruction: '',
      cronExpression: '',
      isActive: true,
    };
  }

  startEdit(schedule: AutomationSchedule): void {
    this.editingId.set(schedule.id);
    this.editFormData = {
      userId: schedule.userId,
      automationKey: schedule.automationKey,
      title: schedule.title,
      instruction: schedule.instruction,
      cronExpression: schedule.cronExpression,
      isActive: schedule.isActive,
    };
    this.showEditModal.set(true);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editFormData = null;
    this.showEditModal.set(false);
  }

  async onUpdate(): Promise<void> {
    const id = this.editingId();
    const data = this.editFormData;
    if (
      !id ||
      !data ||
      !data.userId.trim() ||
      !data.automationKey.trim() ||
      !data.title.trim() ||
      !data.instruction.trim() ||
      !data.cronExpression.trim()
    )
      return;

    this.saving = true;
    try {
      await this.service.update(id, {
        userId: data.userId.trim(),
        automationKey: data.automationKey.trim(),
        title: data.title.trim(),
        instruction: data.instruction.trim(),
        cronExpression: data.cronExpression.trim(),
        isActive: data.isActive,
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
