import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { applyGlobalPipes, getAdminToken, authHeader } from './helpers';
import dataSource from './../src/database/data-source';
import { AuditEvent } from './../src/audit/audit-event.entity';

describe('Audit (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

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

  describe('GET /audit-events', () => {
    it('rejects without auth (401)', async () => {
      await request(app.getHttpServer()).get('/audit-events').expect(401);
    });

    it('returns events with admin token (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-events')
        .set(authHeader(adminToken))
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('nextCursor');
      expect(response.body).toHaveProperty('hasMore');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('supports cursor pagination', async () => {
      const firstResponse = await request(app.getHttpServer())
        .get('/audit-events?limit=1')
        .set(authHeader(adminToken))
        .expect(200);

      expect(firstResponse.body.data.length).toBeLessThanOrEqual(1);
      expect(firstResponse.body).toHaveProperty('nextCursor');
      expect(firstResponse.body).toHaveProperty('hasMore');

      if (firstResponse.body.nextCursor) {
        const secondResponse = await request(app.getHttpServer())
          .get(`/audit-events?limit=1&cursor=${encodeURIComponent(firstResponse.body.nextCursor)}`)
          .set(authHeader(adminToken))
          .expect(200);

        expect(Array.isArray(secondResponse.body.data)).toBe(true);
        expect(secondResponse.body.data[0]?.id).not.toBe(firstResponse.body.data[0]?.id);
      }
    });

    it('rejects invalid cursor', async () => {
      await request(app.getHttpServer())
        .get('/audit-events?cursor=invalid')
        .set(authHeader(adminToken))
        .expect(400);
    });

    it('filters by action', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-events?action=AUTH_LOGIN_SUCCESS')
        .set(authHeader(adminToken))
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((event: { action: string }) => {
        expect(event.action).toBe('AUTH_LOGIN_SUCCESS');
      });
    });

    it('filters by severity', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-events?severity=INFO')
        .set(authHeader(adminToken))
        .expect(200);

      response.body.data.forEach((event: { severity: string }) => {
        expect(event.severity).toBe('INFO');
      });
    });
  });

  describe('GET /audit-events/:id', () => {
    it('returns single event', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/audit-events?limit=20')
        .set(authHeader(adminToken))
        .expect(200);

      if (listResponse.body.data.length > 0) {
        const event = listResponse.body.data[0];
        const response = await request(app.getHttpServer())
          .get(`/audit-events/${event.id}`)
          .set(authHeader(adminToken))
          .expect(200);

        expect(response.body).toHaveProperty('id', event.id);
        expect(response.body).toHaveProperty('action');
      }
    });
  });

  describe('Audit events creation', () => {
    it('creates AUTH_LOGIN_SUCCESS on login', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: process.env.ADMIN_EMAIL ?? 'admin@softmaking.cl',
          password: process.env.ADMIN_PASSWORD ?? 'ChangeMe123!',
        })
        .expect(201);

      await dataSource.initialize();
      const auditRepo = dataSource.getRepository(AuditEvent);
      const event = await auditRepo.findOne({
        where: { action: 'AUTH_LOGIN_SUCCESS' },
        order: { createdAt: 'DESC' },
      });
      await dataSource.destroy();

      expect(event).not.toBeNull();
      expect(event?.severity).toBe('INFO');
    });

    it('creates AUTH_LOGIN_FAILED on wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@softmaking.cl', password: 'Wrong123!' })
        .expect(401);

      await dataSource.initialize();
      const auditRepo = dataSource.getRepository(AuditEvent);
      const event = await auditRepo.findOne({
        where: { action: 'AUTH_LOGIN_FAILED' },
        order: { createdAt: 'DESC' },
      });
      await dataSource.destroy();

      expect(event).not.toBeNull();
      expect(['WARNING', 'CRITICAL']).toContain(event?.severity);
    });

    it('creates ORGANIZATION_CREATED on create', async () => {
      await request(app.getHttpServer())
        .post('/organizations')
        .set(authHeader(adminToken))
        .send({ code: `AUDIT-TEST-${Date.now()}`, name: 'Audit Test Org' })
        .expect(201);

      await dataSource.initialize();
      const auditRepo = dataSource.getRepository(AuditEvent);
      const event = await auditRepo.findOne({
        where: { action: 'ORGANIZATION_CREATED' },
        order: { createdAt: 'DESC' },
      });
      await dataSource.destroy();

      expect(event).not.toBeNull();
      expect(event?.resourceType).toBe('ORGANIZATION');
    });
  });
});
