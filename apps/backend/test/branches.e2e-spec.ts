import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { applyGlobalPipes, getAdminToken, authHeader } from './helpers';

describe('Branches (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let createdOrgId: string;
  let createdBranchId: string;
  let testBranchCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyGlobalPipes(app);
    await app.init();
    adminToken = await getAdminToken(app);

    const orgResponse = await request(app.getHttpServer())
      .post('/organizations')
      .set(authHeader(adminToken))
      .send({
        code: `BRANCH-TEST-ORG-${Date.now()}`,
        name: 'Branch Test Org',
      });
    createdOrgId = orgResponse.body.id;
    testBranchCode = `BR-${Date.now()}`;
  });

  afterAll(async () => {
    if (createdOrgId) {
      await request(app.getHttpServer())
        .delete(`/organizations/${createdOrgId}`)
        .set(authHeader(adminToken));
    }
    await app.close();
  });

  describe('POST /branches', () => {
    it('rejects without auth (401)', async () => {
      await request(app.getHttpServer())
        .post('/branches')
        .send({ organizationId: createdOrgId, code: 'T', name: 'T' })
        .expect(401);
    });

    it('creates branch (201)', async () => {
      const response = await request(app.getHttpServer())
        .post('/branches')
        .set(authHeader(adminToken))
        .send({
          organizationId: createdOrgId,
          code: testBranchCode,
          name: 'Test Branch',
          description: 'E2E test',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.code).toBe(testBranchCode);
      expect(response.body.name).toBe('Test Branch');
      expect(response.body.isActive).toBe(true);
      createdBranchId = response.body.id;
    });

    it('rejects duplicate code within same org (409)', async () => {
      await request(app.getHttpServer())
        .post('/branches')
        .set(authHeader(adminToken))
        .send({
          organizationId: createdOrgId,
          code: testBranchCode,
          name: 'Duplicate',
        })
        .expect(409);
    });
  });

  describe('GET /branches', () => {
    it('returns all branches', async () => {
      const response = await request(app.getHttpServer())
        .get('/branches')
        .set(authHeader(adminToken))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('filters by organizationId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/branches?organizationId=${createdOrgId}`)
        .set(authHeader(adminToken))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((branch: { organizationId: string }) => {
        expect(branch.organizationId).toBe(createdOrgId);
      });
    });
  });

  describe('GET /branches/:id', () => {
    it('returns branch', async () => {
      const response = await request(app.getHttpServer())
        .get(`/branches/${createdBranchId}`)
        .set(authHeader(adminToken))
        .expect(200);

      expect(response.body).toHaveProperty('id', createdBranchId);
    });
  });

  describe('PATCH /branches/:id', () => {
    it('updates branch', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/branches/${createdBranchId}`)
        .set(authHeader(adminToken))
        .send({ name: 'Updated Branch' })
        .expect(200);

      expect(response.body.name).toBe('Updated Branch');
    });
  });

  describe('PATCH /branches/:id/activate', () => {
    it('activates branch', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/branches/${createdBranchId}/activate`)
        .set(authHeader(adminToken))
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });
  });

  describe('PATCH /branches/:id/deactivate', () => {
    it('deactivates branch', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/branches/${createdBranchId}/deactivate`)
        .set(authHeader(adminToken))
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });
  });

  describe('DELETE /branches/:id', () => {
    it('deletes branch', async () => {
      await request(app.getHttpServer())
        .delete(`/branches/${createdBranchId}`)
        .set(authHeader(adminToken))
        .expect(200);
    });
  });
});
