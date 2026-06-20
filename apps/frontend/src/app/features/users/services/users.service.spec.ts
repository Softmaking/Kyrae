import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UsersService } from './users.service';
import { API_BASE_URL } from '../../../core/config/api.config';

const mockUsers = [
  {
    id: 'u-1',
    email: 'user1@test.cl',
    firstName: 'User',
    firstSurname: 'One',
    secondSurname: undefined,
    rut: undefined,
    fullName: 'User One',
    roles: ['admin'],
    permissions: ['USERS_READ'],
  },
  {
    id: 'u-2',
    email: 'user2@test.cl',
    firstName: 'User',
    firstSurname: 'Two',
    secondSurname: undefined,
    rut: undefined,
    fullName: 'User Two',
    roles: ['viewer'],
    permissions: [],
  },
];

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), UsersService],
    });

    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeDefined();
  });

  describe('initial state', () => {
    it('should start with empty users and not loading', () => {
      expect(service.users()).toEqual([]);
      expect(service.loading()).toBe(false);
    });
  });

  describe('loadAll', () => {
    it('should fetch users and update signal', async () => {
      const promise = service.loadAll();

      const req = httpMock.expectOne(`${API_BASE_URL}/users`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);

      await promise;
      expect(service.users()).toEqual(mockUsers);
    });

    it('should set loading to true during request and false after', async () => {
      const promise = service.loadAll();

      expect(service.loading()).toBe(true);

      httpMock.expectOne(`${API_BASE_URL}/users`).flush(mockUsers);
      await promise;

      expect(service.loading()).toBe(false);
    });

    it('should set loading to false even on error', async () => {
      const promise = service.loadAll();

      expect(service.loading()).toBe(true);

      httpMock.expectOne(`${API_BASE_URL}/users`).error(new ProgressEvent('Network error'));
      try {
        await promise;
      } catch {
        // expected
      }

      expect(service.loading()).toBe(false);
    });
  });

  describe('create', () => {
    it('should POST a new user and reload', async () => {
      const dto = {
        email: 'new@test.cl',
        firstName: 'New',
        firstSurname: 'User',
        secondSurname: '',
        rut: '',
        roleIds: [],
      };
      const created = { id: 'u-3', ...dto, fullName: 'New User', roles: [], permissions: [] };

      const promise = service.create(dto as any);

      const postReq = httpMock.expectOne(`${API_BASE_URL}/users`);
      expect(postReq.request.method).toBe('POST');
      expect(postReq.request.body).toEqual(dto);
      postReq.flush(created);

      await Promise.resolve();
      const getReq = httpMock.expectOne(`${API_BASE_URL}/users`);
      getReq.flush([...mockUsers, created]);

      const result = await promise;
      expect(result).toEqual(created);
      expect(service.users().length).toBe(3);
    });
  });

  describe('update', () => {
    it('should PATCH the user and reload', async () => {
      const dto = { firstName: 'Updated' };
      const updated = { ...mockUsers[0], firstName: 'Updated', fullName: 'Updated One' };

      const promise = service.update('u-1', dto);

      const patchReq = httpMock.expectOne(`${API_BASE_URL}/users/u-1`);
      expect(patchReq.request.method).toBe('PATCH');
      expect(patchReq.request.body).toEqual(dto);
      patchReq.flush(updated);

      await Promise.resolve();
      const getReq = httpMock.expectOne(`${API_BASE_URL}/users`);
      getReq.flush([updated, mockUsers[1]]);

      const result = await promise;
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should DELETE the user and reload', async () => {
      const promise = service.remove('u-1');

      const deleteReq = httpMock.expectOne(`${API_BASE_URL}/users/u-1`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush(null);

      await Promise.resolve();
      const getReq = httpMock.expectOne(`${API_BASE_URL}/users`);
      getReq.flush([mockUsers[1]]);

      await promise;
      expect(service.users().length).toBe(1);
    });
  });
});
