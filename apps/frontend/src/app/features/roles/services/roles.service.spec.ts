import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RolesService } from './roles.service';
import { API_BASE_URL } from '../../../core/config/api.config';

const mockRoles = [
  { id: 'r-1', name: 'admin', description: 'Administrator', permissions: [] },
  { id: 'r-2', name: 'viewer', description: 'Viewer', permissions: [] },
];

describe('RolesService', () => {
  let service: RolesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), RolesService],
    });

    service = TestBed.inject(RolesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeDefined();
  });

  describe('initial state', () => {
    it('should start with empty roles and not loading', () => {
      expect(service.roles()).toEqual([]);
      expect(service.loading()).toBe(false);
    });
  });

  describe('loadAll', () => {
    it('should fetch roles and update signal', async () => {
      const promise = service.loadAll();

      const req = httpMock.expectOne(`${API_BASE_URL}/roles`);
      expect(req.request.method).toBe('GET');
      req.flush(mockRoles);

      await promise;
      expect(service.roles()).toEqual(mockRoles);
    });

    it('should set loading to true during request and false after', async () => {
      const promise = service.loadAll();

      expect(service.loading()).toBe(true);

      httpMock.expectOne(`${API_BASE_URL}/roles`).flush(mockRoles);
      await promise;

      expect(service.loading()).toBe(false);
    });

    it('should set loading to false even on error', async () => {
      const promise = service.loadAll();

      httpMock.expectOne(`${API_BASE_URL}/roles`).error(new ProgressEvent('Network error'));
      try {
        await promise;
      } catch {
        // expected
      }

      expect(service.loading()).toBe(false);
    });
  });

  describe('create', () => {
    it('should POST a new role and reload', async () => {
      const dto = { name: 'editor', description: 'Editor', permissionIds: [] };
      const created = { id: 'r-3', ...dto, permissions: [] };

      const promise = service.create(dto);

      const postReq = httpMock.expectOne(`${API_BASE_URL}/roles`);
      expect(postReq.request.method).toBe('POST');
      expect(postReq.request.body).toEqual(dto);
      postReq.flush(created);

      await Promise.resolve();
      const getReq = httpMock.expectOne(`${API_BASE_URL}/roles`);
      getReq.flush([...mockRoles, created]);

      const result = await promise;
      expect(result).toEqual(created);
      expect(service.roles().length).toBe(3);
    });
  });

  describe('update', () => {
    it('should PATCH the role and reload', async () => {
      const dto = { description: 'Updated desc' };
      const updated = { ...mockRoles[0], ...dto };

      const promise = service.update('r-1', dto);

      const patchReq = httpMock.expectOne(`${API_BASE_URL}/roles/r-1`);
      expect(patchReq.request.method).toBe('PATCH');
      expect(patchReq.request.body).toEqual(dto);
      patchReq.flush(updated);

      await Promise.resolve();
      const getReq = httpMock.expectOne(`${API_BASE_URL}/roles`);
      getReq.flush([updated, mockRoles[1]]);

      const result = await promise;
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should DELETE the role and reload', async () => {
      const promise = service.remove('r-1');

      const deleteReq = httpMock.expectOne(`${API_BASE_URL}/roles/r-1`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush(null);

      await Promise.resolve();
      const getReq = httpMock.expectOne(`${API_BASE_URL}/roles`);
      getReq.flush([mockRoles[1]]);

      await promise;
      expect(service.roles().length).toBe(1);
    });
  });
});
