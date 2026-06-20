import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ConfigurationService],
    });

    service = TestBed.inject(ConfigurationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads configs with filters', async () => {
    const promise = service.load({ category: 'app', isActive: true, page: 1, pageSize: 10 });
    const req = httpMock.expectOne((r) =>
      r.urlWithParams.includes(
        `${API_BASE_URL}/configuration?category=app&isActive=true&page=1&pageSize=10`
      )
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [{ id: 'c-1', key: 'app.name', value: 'Kyrae' }],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    await promise;

    expect(service.configs().length).toBe(1);
    expect(service.total()).toBe(1);
  });

  it('creates, updates, finds and removes configuration', async () => {
    const createdPromise = service.create({ key: 'app.flag', value: true });
    const createReq = httpMock.expectOne(`${API_BASE_URL}/configuration`);
    expect(createReq.request.method).toBe('POST');
    createReq.flush({ id: 'c-1', key: 'app.flag', value: true });
    await createdPromise;

    const updatePromise = service.update('c-1', { value: false });
    const updateReq = httpMock.expectOne(`${API_BASE_URL}/configuration/c-1`);
    expect(updateReq.request.method).toBe('PATCH');
    updateReq.flush({ id: 'c-1', key: 'app.flag', value: false });
    await updatePromise;

    const findPromise = service.findByKey('app.flag');
    const findReq = httpMock.expectOne(`${API_BASE_URL}/configuration/key/app.flag`);
    expect(findReq.request.method).toBe('GET');
    findReq.flush({ id: 'c-1', key: 'app.flag', value: false });
    await findPromise;

    const deletePromise = service.remove('c-1');
    const deleteReq = httpMock.expectOne(`${API_BASE_URL}/configuration/c-1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush({});
    await deletePromise;
  });
});
