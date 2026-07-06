import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import type {
  AutomationSchedule,
  AutomationScheduleFilters,
  CreateAutomationScheduleDto,
  UpdateAutomationScheduleDto,
} from '../models/automation-schedules.model';

@Injectable({ providedIn: 'root' })
export class AutomationSchedulesService {
  private readonly apiBaseUrl = API_BASE_URL;

  readonly schedules = signal<AutomationSchedule[]>([]);
  readonly total = signal<number>(0);
  readonly loading = signal<boolean>(false);

  constructor(private readonly http: HttpClient) {}

  async load(filters: AutomationScheduleFilters = {}): Promise<void> {
    this.loading.set(true);
    try {
      const params = new URLSearchParams();
      if (typeof filters.isActive === 'boolean') params.set('isActive', String(filters.isActive));
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

      const result = await firstValueFrom(
        this.http.get<{ data: AutomationSchedule[]; total: number }>(
          `${this.apiBaseUrl}/automation-schedules?${params.toString()}`
        )
      );
      this.schedules.set(result.data);
      this.total.set(result.total);
    } finally {
      this.loading.set(false);
    }
  }

  async create(dto: CreateAutomationScheduleDto): Promise<AutomationSchedule> {
    return firstValueFrom(
      this.http.post<AutomationSchedule>(`${this.apiBaseUrl}/automation-schedules`, dto)
    );
  }

  async update(id: string, dto: UpdateAutomationScheduleDto): Promise<AutomationSchedule> {
    return firstValueFrom(
      this.http.patch<AutomationSchedule>(`${this.apiBaseUrl}/automation-schedules/${id}`, dto)
    );
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiBaseUrl}/automation-schedules/${id}`));
  }
}
