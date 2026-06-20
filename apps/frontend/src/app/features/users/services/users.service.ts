import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import type { User, CreateUserDto, UpdateUserDto } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly apiBaseUrl = API_BASE_URL;

  readonly users = signal<User[]>([]);
  readonly loading = signal<boolean>(false);

  constructor(private readonly http: HttpClient) {}

  async findOne(id: string): Promise<User> {
    return firstValueFrom(this.http.get<User>(`${this.apiBaseUrl}/users/${id}`));
  }

  async loadAll(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.http.get<User[]>(`${this.apiBaseUrl}/users`));
      this.users.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  async create(dto: CreateUserDto): Promise<User> {
    const result = await firstValueFrom(this.http.post<User>(`${this.apiBaseUrl}/users`, dto));
    await this.loadAll();
    return result;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const result = await firstValueFrom(
      this.http.patch<User>(`${this.apiBaseUrl}/users/${id}`, dto)
    );
    await this.loadAll();
    return result;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiBaseUrl}/users/${id}`));
    await this.loadAll();
  }
}
