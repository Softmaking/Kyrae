import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppTableComponent } from '../../../shared/components/table/app-table.component';
import type { AuditEvent, AuditFilters } from '../models/audit.model';
import { AuditService } from '../services/audit.service';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, AppTableComponent],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css',
})
export class AuditComponent implements OnInit {
  filters: AuditFilters = {};
  readonly severityOptions = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
  readonly searchTerm = signal('');
  readonly pageSize = signal(20);
  readonly pageSizeOptions = [20, 50, 100];
  readonly selectedEvent = signal<AuditEvent | null>(null);
  readonly displayedEvents = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const events = this.auditService.events();

    if (!term) return events;

    return events.filter((event) =>
      [
        event.action,
        event.resourceType ?? '',
        event.resourceId ?? '',
        event.severity ?? 'INFO',
        event.ipAddress ?? '',
        event.actorUserId ?? '',
        event.actorUserEmail ?? '',
        event.actorUserName ?? '',
        event.targetUserId ?? '',
        event.targetUserEmail ?? '',
        event.targetUserName ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  });

  constructor(readonly auditService: AuditService) {}

  async ngOnInit(): Promise<void> {
    await this.loadEvents();
  }

  async loadEvents(): Promise<void> {
    await this.auditService.load({
      action: this.filters.action,
      actorUserId: this.filters.actorUserId,
      targetUserId: this.filters.targetUserId,
      resourceType: this.filters.resourceType,
      resourceId: this.filters.resourceId,
      dateFrom: this.filters.dateFrom,
      dateTo: this.filters.dateTo,
      severity: this.filters.severity,
      limit: this.pageSize(),
    });
  }

  async loadMore(): Promise<void> {
    await this.auditService.load(
      {
        action: this.filters.action,
        actorUserId: this.filters.actorUserId,
        targetUserId: this.filters.targetUserId,
        resourceType: this.filters.resourceType,
        resourceId: this.filters.resourceId,
        dateFrom: this.filters.dateFrom,
        dateTo: this.filters.dateTo,
        severity: this.filters.severity,
        limit: this.pageSize(),
      },
      true
    );
  }

  async applyFilters(): Promise<void> {
    await this.loadEvents();
  }

  async clearFilters(): Promise<void> {
    this.filters = {};
    this.searchTerm.set('');
    await this.loadEvents();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  async onPageSizeChange(value: number): Promise<void> {
    this.pageSize.set(value);
    await this.loadEvents();
  }

  openEventDetail(event: AuditEvent): void {
    this.selectedEvent.set(event);
  }

  closeEventDetail(): void {
    this.selectedEvent.set(null);
  }

  severityClass(severity: string | null): string {
    switch (severity) {
      case 'WARNING':
        return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
      case 'ERROR':
        return 'bg-red-50 text-red-700 ring-red-600/20';
      case 'CRITICAL':
        return 'bg-purple-50 text-purple-700 ring-purple-600/20';
      default:
        return 'bg-green-50 text-green-700 ring-green-600/20';
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }

  formatMetadata(metadata: Record<string, unknown> | null): string {
    return metadata ? JSON.stringify(metadata, null, 2) : 'Sin metadata';
  }
}
