import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
    permissions: string[];
  };
}

export function applyGlobalPipes(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );
}

export async function getAdminToken(app: INestApplication): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      email: process.env.ADMIN_EMAIL ?? 'admin@softmaking.cl',
      password: process.env.ADMIN_PASSWORD ?? 'ChangeMe123!',
    })
    .expect(201);

  const body = response.body as LoginResponse;
  return body.accessToken;
}

export async function loginAs(
  app: INestApplication,
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });

  return response.body as LoginResponse;
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
