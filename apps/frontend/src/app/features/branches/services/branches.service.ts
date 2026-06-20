import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  AssignUserToBranchCommand,
  Branch,
  BranchUserDto,
  CreateBranchDto,
  ListBranchesQuery,
  UpdateBranchDto,
} from '../models/branch.model';

@Injectable({ providedIn: 'root' })
export class BranchesService {
  private readonly apiBaseUrl = API_BASE_URL;

  readonly branches = signal<Branch[]>([]);
  readonly loading = signal<boolean>(false);

  constructor(private readonly http: HttpClient) {}

  async findOne(id: string): Promise<Branch> {
    return firstValueFrom(this.http.get<Branch>(`${this.apiBaseUrl}/branches/${id}`));
  }

  async load(query: ListBranchesQuery = {}): Promise<void> {
    this.loading.set(true);
    try {
      let params = new HttpParams();
      if (query.organizationId) {
        params = params.set('organizationId', query.organizationId);
      }

      const data = await firstValueFrom(
        this.http.get<Branch[]>(`${this.apiBaseUrl}/branches`, { params })
      );
      this.branches.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  async loadAll(): Promise<void> {
    await this.load();
  }

  async loadByOrganization(organizationId: string): Promise<void> {
    await this.load({ organizationId });
  }

  async create(dto: CreateBranchDto): Promise<Branch> {
    const result = await firstValueFrom(this.http.post<Branch>(`${this.apiBaseUrl}/branches`, dto));
    await this.loadAll();
    return result;
  }

  async update(id: string, dto: UpdateBranchDto): Promise<Branch> {
    const result = await firstValueFrom(
      this.http.patch<Branch>(`${this.apiBaseUrl}/branches/${id}`, dto)
    );
    await this.loadAll();
    return result;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiBaseUrl}/branches/${id}`));
    await this.loadAll();
  }

  async activate(id: string): Promise<void> {
    await firstValueFrom(this.http.patch(`${this.apiBaseUrl}/branches/${id}/activate`, {}));
    await this.loadAll();
  }

  async deactivate(id: string): Promise<void> {
    await firstValueFrom(this.http.patch(`${this.apiBaseUrl}/branches/${id}/deactivate`, {}));
    await this.loadAll();
  }

  async getUsers(branchId: string): Promise<BranchUserDto[]> {
    return firstValueFrom(
      this.http.get<BranchUserDto[]>(`${this.apiBaseUrl}/branches/${branchId}/users`)
    );
  }

  async assignUser(branchId: string, userId: string): Promise<void> {
    const payload: AssignUserToBranchCommand = { userId };
    await firstValueFrom(this.http.post(`${this.apiBaseUrl}/branches/${branchId}/users`, payload));
  }

  async removeUser(branchId: string, userId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.apiBaseUrl}/branches/${branchId}/users/${userId}`)
    );
  }
}
