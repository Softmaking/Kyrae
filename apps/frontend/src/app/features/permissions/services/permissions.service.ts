import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import type { Permission, CreatePermissionDto } from '../models/permission.model';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly apiBaseUrl = API_BASE_URL;

  readonly permissions = signal<Permission[]>([]);
  readonly loading = signal<boolean>(false);

  constructor(private readonly http: HttpClient) {}

  async findOne(id: string): Promise<Permission> {
    return firstValueFrom(this.http.get<Permission>(`${this.apiBaseUrl}/permissions/${id}`));
  }

  async loadAll(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get<Permission[]>(`${this.apiBaseUrl}/permissions`)
      );
      this.permissions.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const result = await firstValueFrom(
      this.http.post<Permission>(`${this.apiBaseUrl}/permissions`, dto)
    );
    await this.loadAll();
    return result;
  }

  async update(id: string, dto: Partial<CreatePermissionDto>): Promise<Permission> {
    const result = await firstValueFrom(
      this.http.patch<Permission>(`${this.apiBaseUrl}/permissions/${id}`, dto)
    );
    await this.loadAll();
    return result;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiBaseUrl}/permissions/${id}`));
    await this.loadAll();
  }
}
