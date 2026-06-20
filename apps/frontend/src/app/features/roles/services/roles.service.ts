import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import type { Role, CreateRoleDto, UpdateRoleDto } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly apiBaseUrl = API_BASE_URL;

  readonly roles = signal<Role[]>([]);
  readonly loading = signal<boolean>(false);

  constructor(private readonly http: HttpClient) {}

  async findOne(id: string): Promise<Role> {
    return firstValueFrom(this.http.get<Role>(`${this.apiBaseUrl}/roles/${id}`));
  }

  async loadAll(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.http.get<Role[]>(`${this.apiBaseUrl}/roles`));
      this.roles.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const result = await firstValueFrom(this.http.post<Role>(`${this.apiBaseUrl}/roles`, dto));
    await this.loadAll();
    return result;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const result = await firstValueFrom(
      this.http.patch<Role>(`${this.apiBaseUrl}/roles/${id}`, dto)
    );
    await this.loadAll();
    return result;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiBaseUrl}/roles/${id}`));
    await this.loadAll();
  }
}
