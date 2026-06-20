import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { applyGlobalPipes, getAdminToken, authHeader, LoginResponse } from './helpers';
import dataSource from './../src/database/data-source';
import { User } from './../src/users/user.entity';
import * as bcrypt from 'bcrypt';

describe('Auth (e2e)', () => {
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

  describe('POST /auth/login', () => {
    it('returns tokens with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: process.env.ADMIN_EMAIL ?? 'admin@softmaking.cl',
          password: process.env.ADMIN_PASSWORD ?? 'ChangeMe123!',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('tokenType', 'Bearer');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('roles');
      expect(response.body.user).toHaveProperty('permissions');
    });

    it('rejects email without TLD (400)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@local', password: 'ChangeMe123!' })
        .expect(400);
    });

    it('rejects invalid email format (400)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: 'ChangeMe123!' })
        .expect(400);
    });

    it('rejects wrong email (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@softmaking.cl', password: 'ChangeMe123!' })
        .expect(401);
    });

    it('rejects wrong password (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: process.env.ADMIN_EMAIL ?? 'admin@softmaking.cl',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });
  });

  describe('Account lockout', () => {
    const testEmail = 'lockout-test@softmaking.cl';
    const testPassword = 'TestPass123!';

    beforeAll(async () => {
      await dataSource.initialize();
      const userRepo = dataSource.getRepository(User);
      const user = userRepo.create({
        email: testEmail,
        firstName: 'Lockout',
        firstSurname: 'Test User',
        passwordHash: await bcrypt.hash(testPassword, 10),
        isActive: true,
      });
      await userRepo.save(user);
      await dataSource.destroy();
    });

    afterAll(async () => {
      await dataSource.initialize();
      const userRepo = dataSource.getRepository(User);
      await userRepo.delete({ email: testEmail });
      await dataSource.destroy();
    });

    it('locks account after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: testEmail, password: 'WrongPassword123!' })
          .expect(401);
      }

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(401);

      expect(response.body.message).toContain('locked');
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: process.env.ADMIN_EMAIL ?? 'admin@softmaking.cl',
          password: process.env.ADMIN_PASSWORD ?? 'ChangeMe123!',
        });
      refreshToken = (response.body as LoginResponse).refreshToken;
    });

    it('returns new tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('rejects revoked refresh token (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set(authHeader(adminToken))
        .expect(201);

      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(401);

      adminToken = await getAdminToken(app);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes refresh token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: process.env.ADMIN_EMAIL ?? 'admin@softmaking.cl',
          password: process.env.ADMIN_PASSWORD ?? 'ChangeMe123!',
        });

      const token = (loginResponse.body as LoginResponse).accessToken;
      const rt = (loginResponse.body as LoginResponse).refreshToken;

      await request(app.getHttpServer()).post('/auth/logout').set(authHeader(token)).expect(201);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: rt })
        .expect(401);
    });
  });
});
