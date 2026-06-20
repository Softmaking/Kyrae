import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { applyGlobalPipes, authHeader, getAdminToken } from './helpers';

describe('Permissions (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let createdPermissionId: string;

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

  it('rejects create without auth (401)', async () => {
    await request(app.getHttpServer())
      .post('/permissions')
      .send({ name: 'NOAUTH_TEST' })
      .expect(401);
  });

  it('creates permission (201)', async () => {
    const response = await request(app.getHttpServer())
      .post('/permissions')
      .set(authHeader(adminToken))
      .send({ name: `E2E_PERMISSION_${Date.now()}`, description: 'Permission test' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    createdPermissionId = response.body.id;
  });

  it('lists permissions (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/permissions')
      .set(authHeader(adminToken))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('gets permission by id (200)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/permissions/${createdPermissionId}`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body).toHaveProperty('id', createdPermissionId);
  });

  it('returns 404 for unknown permission', async () => {
    await request(app.getHttpServer())
      .get('/permissions/00000000-0000-0000-0000-000000000000')
      .set(authHeader(adminToken))
      .expect(404);
  });

  it('updates permission (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/permissions/${createdPermissionId}`)
      .set(authHeader(adminToken))
      .send({ description: 'Updated permission desc' })
      .expect(200);

    expect(response.body).toHaveProperty('description', 'Updated permission desc');
  });

  it('deletes permission (200)', async () => {
    await request(app.getHttpServer())
      .delete(`/permissions/${createdPermissionId}`)
      .set(authHeader(adminToken))
      .expect(200);
  });
});
