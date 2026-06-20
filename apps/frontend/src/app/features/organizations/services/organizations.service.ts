import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  AssignUserToOrganizationCommand,
  CreateOrganizationDto,
  Organization,
  OrganizationUserDto,
  UpdateOrganizationDto,
} from '../models/organization.model';

@Injectable({ providedIn: 'root' })
export class OrganizationsService {
  private readonly apiBaseUrl = API_BASE_URL;

  readonly organizations = signal<Organization[]>([]);
  readonly loading = signal<boolean>(false);

  constructor(private readonly http: HttpClient) {}

  async findOne(id: string): Promise<Organization> {
    return firstValueFrom(this.http.get<Organization>(`${this.apiBaseUrl}/organizations/${id}`));
  }

  async loadAll(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get<Organization[]>(`${this.apiBaseUrl}/organizations`)
      );
      this.organizations.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    const result = await firstValueFrom(
      this.http.post<Organization>(`${this.apiBaseUrl}/organizations`, dto)
    );
    await this.loadAll();
    return result;
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    const result = await firstValueFrom(
      this.http.patch<Organization>(`${this.apiBaseUrl}/organizations/${id}`, dto)
    );
    await this.loadAll();
    return result;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiBaseUrl}/organizations/${id}`));
    await this.loadAll();
  }

  async activate(id: string): Promise<void> {
    await firstValueFrom(this.http.patch(`${this.apiBaseUrl}/organizations/${id}/activate`, {}));
    await this.loadAll();
  }

  async deactivate(id: string): Promise<void> {
    await firstValueFrom(this.http.patch(`${this.apiBaseUrl}/organizations/${id}/deactivate`, {}));
    await this.loadAll();
  }

  async assignUser(organizationId: string, userId: string): Promise<void> {
    const payload: AssignUserToOrganizationCommand = { userId };
    await firstValueFrom(
      this.http.post(`${this.apiBaseUrl}/organizations/${organizationId}/users`, payload)
    );
  }

  async getUsers(organizationId: string): Promise<OrganizationUserDto[]> {
    return firstValueFrom(
      this.http.get<OrganizationUserDto[]>(
        `${this.apiBaseUrl}/organizations/${organizationId}/users`
      )
    );
  }

  async removeUser(organizationId: string, userId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.apiBaseUrl}/organizations/${organizationId}/users/${userId}`)
    );
  }
}
