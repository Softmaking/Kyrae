import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PermissionsService } from './permissions.service';
import { API_BASE_URL } from '../../../core/config/api.config';

const mockPermissions = [
  { id: 'p-1', code: 'USERS_READ', name: 'Read Users', description: null },
  { id: 'p-2', code: 'USERS_UPDATE', name: 'Update Users', description: null },
];

describe('PermissionsService', () => {
  let service: PermissionsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PermissionsService],
    });

    service = TestBed.inject(PermissionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeDefined();
  });

  describe('initial state', () => {
    it('should start with empty permissions and not loading', () => {
      expect(service.permissions()).toEqual([]);
      expect(service.loading()).toBe(false);
    });
  });

  describe('loadAll', () => {
    it('should fetch permissions and update signal', async () => {
      const promise = service.loadAll();

      const req = httpMock.expectOne(`${API_BASE_URL}/permissions`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPermissions);

      await promise;
      expect(service.permissions()).toEqual(mockPermissions);
    });

    it('should set loading to true during request and false after', async () => {
      const promise = service.loadAll();

      expect(service.loading()).toBe(true);

      httpMock.expectOne(`${API_BASE_URL}/permissions`).flush(mockPermissions);
      await promise;

      expect(service.loading()).toBe(false);
    });

    it('should set loading to false even on error', async () => {
      const promise = service.loadAll();

      httpMock.expectOne(`${API_BASE_URL}/permissions`).error(new ProgressEvent('Network error'));
      try {
        await promise;
      } catch {
        // expected
      }

      expect(service.loading()).toBe(false);
    });
  });

  describe('create', () => {
    it('should POST a new permission and reload', async () => {
      const dto = { code: 'ROLES_READ', name: 'Read Roles', description: null };
      const created = { id: 'p-3', ...dto };

      const promise = service.create(dto as any);

      const postReq = httpMock.expectOne(`${API_BASE_URL}/permissions`);
      expect(postReq.request.method).toBe('POST');
      expect(postReq.request.body).toEqual(dto);
      postReq.flush(created);

      await Promise.resolve();
      const getReq = httpMock.expectOne(`${API_BASE_URL}/permissions`);
      getReq.flush([...mockPermissions, created]);

      const result = await promise;
      expect(result).toEqual(created);
      expect(service.permissions().length).toBe(3);
    });
  });

  describe('update', () => {
    it('should PATCH the permission and reload', async () => {
      const dto = { name: 'Updated Name' };
      const updated = { ...mockPermissions[0], ...dto };

      const promise = service.update('p-1', dto);

      const patchReq = httpMock.expectOne(`${API_BASE_URL}/permissions/p-1`);
      expect(patchReq.request.method).toBe('PATCH');
      expect(patchReq.request.body).toEqual(dto);
      patchReq.flush(updated);

      await Promise.resolve();
      const getReq = httpMock.expectOne(`${API_BASE_URL}/permissions`);
      getReq.flush([updated, mockPermissions[1]]);

      const result = await promise;
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should DELETE the permission and reload', async () => {
      const promise = service.remove('p-1');

      const deleteReq = httpMock.expectOne(`${API_BASE_URL}/permissions/p-1`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush(null);

      await Promise.resolve();
      const getReq = httpMock.expectOne(`${API_BASE_URL}/permissions`);
      getReq.flush([mockPermissions[1]]);

      await promise;
      expect(service.permissions().length).toBe(1);
    });
  });
});
