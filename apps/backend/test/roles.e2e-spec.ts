import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { applyGlobalPipes, authHeader, getAdminToken } from './helpers';

describe('Roles (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let createdRoleId: string;

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
    await request(app.getHttpServer()).post('/roles').send({ name: 'NoAuthRole' }).expect(401);
  });

  it('creates role (201)', async () => {
    const response = await request(app.getHttpServer())
      .post('/roles')
      .set(authHeader(adminToken))
      .send({ name: `role-e2e-${Date.now()}`, description: 'Role test' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name');
    createdRoleId = response.body.id;
  });

  it('lists roles (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/roles')
      .set(authHeader(adminToken))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('gets role by id (200)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/roles/${createdRoleId}`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body).toHaveProperty('id', createdRoleId);
  });

  it('returns 404 for unknown role', async () => {
    await request(app.getHttpServer())
      .get('/roles/00000000-0000-0000-0000-000000000000')
      .set(authHeader(adminToken))
      .expect(404);
  });

  it('updates role (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/roles/${createdRoleId}`)
      .set(authHeader(adminToken))
      .send({ description: 'Updated role desc' })
      .expect(200);

    expect(response.body).toHaveProperty('description', 'Updated role desc');
  });

  it('deletes role (200)', async () => {
    await request(app.getHttpServer())
      .delete(`/roles/${createdRoleId}`)
      .set(authHeader(adminToken))
      .expect(200);
  });
});
