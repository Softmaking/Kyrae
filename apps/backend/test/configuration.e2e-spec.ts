import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { applyGlobalPipes, authHeader, getAdminToken } from './helpers';

describe('Configuration (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let createdConfigId: string;
  let createdConfigKey: string;

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
      .post('/configuration')
      .send({ key: 'cfg.noauth', value: true })
      .expect(401);
  });

  it('creates config (201)', async () => {
    createdConfigKey = `cfg.e2e.${Date.now()}`;
    const response = await request(app.getHttpServer())
      .post('/configuration')
      .set(authHeader(adminToken))
      .send({
        key: createdConfigKey,
        value: { featureEnabled: true },
        description: 'Configuration e2e test',
        category: 'test',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('key', createdConfigKey);
    createdConfigId = response.body.id;
  });

  it('lists configs with pagination shape (200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/configuration?page=1&pageSize=10')
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('total');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('gets config by id (200)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/configuration/${createdConfigId}`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body).toHaveProperty('id', createdConfigId);
  });

  it('gets config by key (200)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/configuration/key/${createdConfigKey}`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body).toHaveProperty('key', createdConfigKey);
  });

  it('updates config (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/configuration/${createdConfigId}`)
      .set(authHeader(adminToken))
      .send({ description: 'Updated configuration description' })
      .expect(200);

    expect(response.body).toHaveProperty('description', 'Updated configuration description');
  });

  it('deletes config (200)', async () => {
    await request(app.getHttpServer())
      .delete(`/configuration/${createdConfigId}`)
      .set(authHeader(adminToken))
      .expect(200);
  });
});
