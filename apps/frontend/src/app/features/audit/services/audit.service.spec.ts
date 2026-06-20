import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuditService],
    });

    service = TestBed.inject(AuditService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads events with cursor metadata', async () => {
    const promise = service.load({ action: 'USER_CREATED', limit: 20 });
    const req = httpMock.expectOne((r) =>
      r.urlWithParams.includes(`${API_BASE_URL}/audit-events?action=USER_CREATED&limit=20`)
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [{ id: 'a-1', action: 'USER_CREATED' }],
      nextCursor: 'cursor-1',
      hasMore: true,
    });
    await promise;

    expect(service.events().length).toBe(1);
    expect(service.nextCursor()).toBe('cursor-1');
    expect(service.hasMore()).toBe(true);
    expect(service.loading()).toBe(false);
  });

  it('appends events without duplicates when loading more', async () => {
    const firstPromise = service.load({ limit: 20 });
    httpMock
      .expectOne((r) => r.urlWithParams.includes(`${API_BASE_URL}/audit-events?limit=20`))
      .flush({
        data: [{ id: 'a-1', action: 'USER_CREATED' }],
        nextCursor: 'cursor-1',
        hasMore: true,
      });
    await firstPromise;

    const secondPromise = service.load({ limit: 20 }, true);
    httpMock
      .expectOne((r) =>
        r.urlWithParams.includes(`${API_BASE_URL}/audit-events?limit=20&cursor=cursor-1`)
      )
      .flush({
        data: [
          { id: 'a-1', action: 'USER_CREATED' },
          { id: 'a-2', action: 'USER_UPDATED' },
        ],
        nextCursor: null,
        hasMore: false,
      });
    await secondPromise;

    expect(service.events().map((event) => event.id)).toEqual(['a-1', 'a-2']);
    expect(service.hasMore()).toBe(false);
  });

  it('sets loading false on error', async () => {
    const promise = service.load();
    expect(service.loading()).toBe(true);
    httpMock
      .expectOne((r) => r.url.startsWith(`${API_BASE_URL}/audit-events`))
      .error(new ProgressEvent('error'));

    try {
      await promise;
    } catch {
      // expected
    }

    expect(service.loading()).toBe(false);
    expect(service.error()).toBe('No se pudieron cargar los eventos de auditoría.');
  });
});
