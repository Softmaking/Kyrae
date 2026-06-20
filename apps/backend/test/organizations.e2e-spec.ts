import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { applyGlobalPipes, getAdminToken, authHeader } from './helpers';

describe('Organizations (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let createdOrgId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyGlobalPipes(app);
    await app.init();
    adminToken = await getAdminToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /organizations', () => {
    it('rejects without auth (401)', async () => {
      await request(app.getHttpServer())
        .post('/organizations')
        .send({ code: 'TEST', name: 'Test' })
        .expect(401);
    });

    it('creates organization (201)', async () => {
      const code = `TEST-ORG-${Date.now()}`;
      const response = await request(app.getHttpServer())
        .post('/organizations')
        .set(authHeader(adminToken))
        .send({ code, name: 'Test Organization', description: 'E2E test' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.code).toBe(code);
      expect(response.body.name).toBe('Test Organization');
      expect(response.body.isActive).toBe(true);
      createdOrgId = response.body.id;
    });

    it('rejects duplicate code (409)', async () => {
      await request(app.getHttpServer())
        .post('/organizations')
        .set(authHeader(adminToken))
        .send({ code: 'DEFAULT', name: 'Duplicate' })
        .expect(409);
    });
  });

  describe('GET /organizations', () => {
    it('returns list', async () => {
      const response = await request(app.getHttpServer())
        .get('/organizations')
        .set(authHeader(adminToken))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /organizations/:id', () => {
    it('returns organization', async () => {
      const response = await request(app.getHttpServer())
        .get(`/organizations/${createdOrgId}`)
        .set(authHeader(adminToken))
        .expect(200);

      expect(response.body).toHaveProperty('id', createdOrgId);
    });

    it('returns 404 for unknown id', async () => {
      await request(app.getHttpServer())
        .get('/organizations/00000000-0000-0000-0000-000000000000')
        .set(authHeader(adminToken))
        .expect(404);
    });
  });

  describe('PATCH /organizations/:id', () => {
    it('updates organization', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/organizations/${createdOrgId}`)
        .set(authHeader(adminToken))
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });
  });

  describe('PATCH /organizations/:id/activate', () => {
    it('activates organization', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/organizations/${createdOrgId}/activate`)
        .set(authHeader(adminToken))
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });
  });

  describe('PATCH /organizations/:id/deactivate', () => {
    it('deactivates organization', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/organizations/${createdOrgId}/deactivate`)
        .set(authHeader(adminToken))
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });
  });

  describe('User assignment', () => {
    it('rejects assigning non-existent user (404)', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/${createdOrgId}/users`)
        .set(authHeader(adminToken))
        .send({ userId: 'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789' })
        .expect(404);
    });
  });

  describe('DELETE /organizations/:id', () => {
    it('deletes organization', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/${createdOrgId}`)
        .set(authHeader(adminToken))
        .expect(200);
    });
  });
});
