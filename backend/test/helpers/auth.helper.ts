/**
 * Convenience helpers for authenticating users inside E2E tests.
 */
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  role?: string;
}

const BASE = '/api/v1';

/**
 * Registers a user and returns the resulting auth tokens.
 * Tenant is identified by the X-Tenant-Slug header (defaults to 'test-tenant').
 */
export async function registerAndLogin(
  app: INestApplication,
  user: TestUser,
  tenantSlug = 'test-tenant',
): Promise<AuthTokens> {
  const server = app.getHttpServer();

  const registerRes = await request(server)
    .post(`${BASE}/auth/register`)
    .set('X-Tenant-Slug', tenantSlug)
    .send({
      email: user.email,
      password: user.password,
      fullName: user.fullName,
    });

  // If already registered, just login
  if (registerRes.status !== 201 && registerRes.status !== 200) {
    return login(app, user, tenantSlug);
  }

  return {
    accessToken: registerRes.body.accessToken,
    refreshToken: registerRes.body.refreshToken,
  };
}

/** Logs in an existing user and returns tokens. */
export async function login(
  app: INestApplication,
  user: Pick<TestUser, 'email' | 'password'>,
  tenantSlug = 'test-tenant',
): Promise<AuthTokens> {
  const res = await request(app.getHttpServer())
    .post(`${BASE}/auth/login`)
    .set('X-Tenant-Slug', tenantSlug)
    .send({ email: user.email, password: user.password });

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Login failed for ${user.email}: ${JSON.stringify(res.body)}`);
  }

  return {
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
  };
}

/** Performs an authenticated GET. */
export function authGet(
  server: ReturnType<INestApplication['getHttpServer']>,
  path: string,
  accessToken: string,
  tenantSlug = 'test-tenant',
) {
  return request(server)
    .get(path)
    .set('Authorization', `Bearer ${accessToken}`)
    .set('X-Tenant-Slug', tenantSlug);
}

/** Performs an authenticated POST. */
export function authPost(
  server: ReturnType<INestApplication['getHttpServer']>,
  path: string,
  accessToken: string,
  body: Record<string, unknown>,
  tenantSlug = 'test-tenant',
) {
  return request(server)
    .post(path)
    .set('Authorization', `Bearer ${accessToken}`)
    .set('X-Tenant-Slug', tenantSlug)
    .send(body);
}
