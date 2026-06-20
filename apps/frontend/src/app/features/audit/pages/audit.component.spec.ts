/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditComponent } from './audit.component';
import { AuditService } from '../services/audit.service';

import type { AuditEventDto } from '@kyrae/shared-contracts';

const mockEvents: AuditEventDto[] = [
  {
    id: 'e-1',
    action: 'AUTH_LOGIN_SUCCESS',
    resourceType: 'AUTH',
    resourceId: null,
    severity: 'INFO' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'Chrome',
    actorUserId: 'u-1',
    actorUserEmail: 'admin@test.cl',
    actorUserName: 'Admin',
    targetUserId: null,
    targetUserEmail: null,
    targetUserName: null,
    metadata: null,
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'e-2',
    action: 'AUTH_LOGIN_FAILED',
    resourceType: 'AUTH',
    resourceId: null,
    severity: 'WARNING' as const,
    ipAddress: '192.168.1.1',
    userAgent: 'Firefox',
    actorUserId: null,
    actorUserEmail: null,
    actorUserName: null,
    targetUserId: null,
    targetUserEmail: null,
    targetUserName: null,
    metadata: { attempts: 3 },
    createdAt: '2025-01-02T00:00:00Z',
  },
];

describe('AuditComponent', () => {
  let fixture: ComponentFixture<AuditComponent>;
  let component: AuditComponent;
  let auditService: AuditService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditComponent],
      providers: [AuditService],
    }).compileComponents();

    auditService = TestBed.inject(AuditService);
    auditService.events.set(mockEvents);
    auditService.loading.set(false);
    vi.spyOn(auditService, 'load').mockResolvedValue();

    fixture = TestBed.createComponent(AuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should display audit events in table', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('should show "Ver detalle" button for each event', () => {
    const detailButtons = fixture.nativeElement.querySelectorAll('.admin-table-action-button');
    expect(detailButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter events by search term', () => {
    component.onSearchChange('LOGIN_SUCCESS');
    fixture.detectChanges();
    expect(component.displayedEvents().length).toBe(1);
    expect(component.displayedEvents()[0].action).toBe('AUTH_LOGIN_SUCCESS');
  });

  it('should open and close event detail', () => {
    component.openEventDetail(mockEvents[0]);
    expect(component.selectedEvent()).toEqual(mockEvents[0]);
    component.closeEventDetail();
    expect(component.selectedEvent()).toBeNull();
  });

  it('should return correct severity class', () => {
    expect(component.severityClass('INFO')).toContain('bg-green-50');
    expect(component.severityClass('WARNING')).toContain('bg-yellow-50');
    expect(component.severityClass('ERROR')).toContain('bg-red-50');
    expect(component.severityClass('CRITICAL')).toContain('bg-purple-50');
    expect(component.severityClass(null)).toContain('bg-green-50');
  });

  it('should format metadata as JSON string', () => {
    const metadata = { foo: 'bar', num: 42 };
    expect(component.formatMetadata(metadata)).toContain('"foo"');
    expect(component.formatMetadata(null)).toBe('Sin metadata');
  });

  it('should apply filters on applyFilters', async () => {
    const loadSpy = vi.spyOn(component, 'loadEvents').mockResolvedValue();
    component.filters = { severity: 'ERROR' };
    await component.applyFilters();
    expect(loadSpy).toHaveBeenCalled();
  });

  it('should clear filters on clearFilters', async () => {
    const loadSpy = vi.spyOn(component, 'loadEvents').mockResolvedValue();
    component.filters = { severity: 'ERROR', action: 'AUTH_LOGIN' };
    component.searchTerm.set('test');
    await component.clearFilters();
    expect(component.filters).toEqual({});
    expect(component.searchTerm()).toBe('');
    expect(loadSpy).toHaveBeenCalled();
  });

  it('loads more events with the current filters', async () => {
    component.filters = { severity: 'WARNING' };
    await component.loadMore();
    expect(auditService.load).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'WARNING', limit: 20 }),
      true
    );
  });

  it('should format dates as locale string', () => {
    const result = component.formatDate('2025-03-15T10:30:00Z');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});
