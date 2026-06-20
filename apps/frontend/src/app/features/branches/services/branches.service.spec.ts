import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api.config';
import { BranchesService } from './branches.service';

const mockBranches = [
  {
    id: 'br-1',
    organizationId: 'org-1',
    code: 'MAIN',
    name: 'Main Branch',
    description: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organization: { id: 'org-1', code: 'ORG1', name: 'Organization 1' },
  },
];

describe('BranchesService', () => {
  let service: BranchesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), BranchesService],
    });

    service = TestBed.inject(BranchesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads all branches', async () => {
    const promise = service.loadAll();
    const req = httpMock.expectOne(`${API_BASE_URL}/branches`);
    expect(req.request.method).toBe('GET');
    req.flush(mockBranches);
    await promise;

    expect(service.branches()).toEqual(mockBranches);
  });

  it('loads branches by organization with query param', async () => {
    const promise = service.loadByOrganization('org-1');
    const req = httpMock.expectOne(
      (r) => r.url === `${API_BASE_URL}/branches` && r.params.get('organizationId') === 'org-1'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockBranches);
    await promise;
  });

  it('creates branch and reloads list', async () => {
    const dto = { organizationId: 'org-1', code: 'NEW', name: 'New Branch' };
    const created = {
      id: 'br-2',
      ...dto,
      description: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      organization: { id: 'org-1', code: 'ORG1', name: 'Organization 1' },
    };

    const promise = service.create(dto);
    httpMock.expectOne(`${API_BASE_URL}/branches`).flush(created);
    await Promise.resolve();
    httpMock.expectOne(`${API_BASE_URL}/branches`).flush([mockBranches[0], created]);
    await promise;

    expect(service.branches().length).toBe(2);
  });
});
