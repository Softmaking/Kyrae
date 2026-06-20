import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { ListAuditEventsResponse } from '@kyrae/shared-contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuditEvent, AuditFilters } from '../models/audit.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly apiBaseUrl = API_BASE_URL;

  readonly events = signal<AuditEvent[]>([]);
  readonly loading = signal<boolean>(false);
  readonly loadingMore = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly nextCursor = signal<string | null>(null);
  readonly hasMore = signal<boolean>(false);

  constructor(private readonly http: HttpClient) {}

  async findOne(id: string): Promise<AuditEvent> {
    return firstValueFrom(this.http.get<AuditEvent>(`${this.apiBaseUrl}/audit-events/${id}`));
  }

  async load(filters: AuditFilters = {}, append = false): Promise<void> {
    if (append && !this.nextCursor()) return;

    this.error.set(null);
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
      this.events.set([]);
      this.nextCursor.set(null);
      this.hasMore.set(false);
    }

    try {
      const params = new URLSearchParams();
      if (filters.action) params.set('action', filters.action);
      if (filters.actorUserId) params.set('actorUserId', filters.actorUserId);
      if (filters.targetUserId) params.set('targetUserId', filters.targetUserId);
      if (filters.resourceType) params.set('resourceType', filters.resourceType);
      if (filters.resourceId) params.set('resourceId', filters.resourceId);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.limit) params.set('limit', String(filters.limit));
      if (append && this.nextCursor()) params.set('cursor', this.nextCursor() as string);

      const result = await firstValueFrom(
        this.http.get<ListAuditEventsResponse>(
          `${this.apiBaseUrl}/audit-events?${params.toString()}`
        )
      );

      if (append) {
        const existingIds = new Set(this.events().map((event) => event.id));
        this.events.update((events) => [
          ...events,
          ...result.data.filter((event) => !existingIds.has(event.id)),
        ]);
      } else {
        this.events.set(result.data);
      }

      this.nextCursor.set(result.nextCursor);
      this.hasMore.set(result.hasMore);
    } catch (error) {
      this.error.set('No se pudieron cargar los eventos de auditoría.');
      throw error;
    } finally {
      this.loading.set(false);
      this.loadingMore.set(false);
    }
  }
}
