import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { applyGlobalPipes, authHeader, getAdminToken } from './helpers';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let createdUserId: string;

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
      .post('/users')
      .send({
        email: 'no-auth@test.cl',
        firstName: 'No',
        firstSurname: 'Auth',
        password: 'ChangeMe123!',
      })
      .expect(401);
  });

  it('creates user (201)', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .set(authHeader(adminToken))
      .send({
        email: `user-${Date.now()}@test.cl`,
        firstName: 'E2E',
        firstSurname: 'Test User',
        password: 'ChangeMe123!',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email');
    expect(response.body).toHaveProperty('firstName', 'E2E');
    expect(response.body).toHaveProperty('firstSurname', 'Test User');
    createdUserId = response.body.id;
  });

  it('lists users (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .set(authHeader(adminToken))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
  });

  it('gets user by id (200)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/users/${createdUserId}`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body).toHaveProperty('id', createdUserId);
  });

  it('returns 404 for unknown user', async () => {
    await request(app.getHttpServer())
      .get('/users/00000000-0000-0000-0000-000000000000')
      .set(authHeader(adminToken))
      .expect(404);
  });

  it('updates user (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/users/${createdUserId}`)
      .set(authHeader(adminToken))
      .send({ firstName: 'Updated', firstSurname: 'E2E' })
      .expect(200);

    expect(response.body).toHaveProperty('firstName', 'Updated');
    expect(response.body).toHaveProperty('firstSurname', 'E2E');
  });

  it('deletes user (200)', async () => {
    await request(app.getHttpServer())
      .delete(`/users/${createdUserId}`)
      .set(authHeader(adminToken))
      .expect(200);
  });
});
