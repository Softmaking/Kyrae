import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api.config';
import { OrganizationsService } from './organizations.service';

const mockOrganizations = [
  {
    id: 'org-1',
    code: 'ORG1',
    name: 'Organization 1',
    description: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), OrganizationsService],
    });

    service = TestBed.inject(OrganizationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads organizations and updates signal', async () => {
    const promise = service.loadAll();
    const req = httpMock.expectOne(`${API_BASE_URL}/organizations`);
    expect(req.request.method).toBe('GET');
    req.flush(mockOrganizations);
    await promise;

    expect(service.organizations()).toEqual(mockOrganizations);
  });

  it('creates organization and reloads list', async () => {
    const dto = { code: 'ORG2', name: 'Organization 2' };
    const created = {
      id: 'org-2',
      ...dto,
      description: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const promise = service.create(dto);
    httpMock.expectOne(`${API_BASE_URL}/organizations`).flush(created);
    await Promise.resolve();
    httpMock.expectOne(`${API_BASE_URL}/organizations`).flush([mockOrganizations[0], created]);

    const result = await promise;
    expect(result).toEqual(created);
    expect(service.organizations().length).toBe(2);
  });

  it('assigns and removes organization users', async () => {
    const assign = service.assignUser('org-1', 'user-1');
    const assignReq = httpMock.expectOne(`${API_BASE_URL}/organizations/org-1/users`);
    expect(assignReq.request.method).toBe('POST');
    expect(assignReq.request.body).toEqual({ userId: 'user-1' });
    assignReq.flush({});
    await assign;

    const remove = service.removeUser('org-1', 'user-1');
    const removeReq = httpMock.expectOne(`${API_BASE_URL}/organizations/org-1/users/user-1`);
    expect(removeReq.request.method).toBe('DELETE');
    removeReq.flush({});
    await remove;
  });
});
