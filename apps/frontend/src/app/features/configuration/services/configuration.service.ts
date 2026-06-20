import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import type {
  AppConfig,
  AppConfigFilters,
  CreateAppConfigDto,
  ListAppConfigsResponse,
  UpdateAppConfigDto,
} from '../models/configuration.model';

@Injectable({ providedIn: 'root' })
export class ConfigurationService {
  private readonly apiBaseUrl = API_BASE_URL;

  readonly configs = signal<AppConfig[]>([]);
  readonly total = signal<number>(0);
  readonly loading = signal<boolean>(false);

  constructor(private readonly http: HttpClient) {}

  async findOne(id: string): Promise<AppConfig> {
    return firstValueFrom(this.http.get<AppConfig>(`${this.apiBaseUrl}/configuration/${id}`));
  }

  async load(filters: AppConfigFilters = {}): Promise<void> {
    this.loading.set(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (typeof filters.isActive === 'boolean') params.set('isActive', String(filters.isActive));
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

      const result = await firstValueFrom(
        this.http.get<ListAppConfigsResponse>(
          `${this.apiBaseUrl}/configuration?${params.toString()}`
        )
      );
      this.configs.set(result.data);
      this.total.set(result.total);
    } finally {
      this.loading.set(false);
    }
  }

  async create(dto: CreateAppConfigDto): Promise<AppConfig> {
    const result = await firstValueFrom(
      this.http.post<AppConfig>(`${this.apiBaseUrl}/configuration`, dto)
    );
    return result;
  }

  async update(id: string, dto: UpdateAppConfigDto): Promise<AppConfig> {
    const result = await firstValueFrom(
      this.http.patch<AppConfig>(`${this.apiBaseUrl}/configuration/${id}`, dto)
    );
    return result;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiBaseUrl}/configuration/${id}`));
  }

  async findByKey(key: string): Promise<AppConfig> {
    return firstValueFrom(this.http.get<AppConfig>(`${this.apiBaseUrl}/configuration/key/${key}`));
  }
}
