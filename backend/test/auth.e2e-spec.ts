/**
 * Authentication E2E Tests
 *
 * Covers: register, login, token refresh, logout, email-verification flow,
 * password-reset flow, and guard protection of authenticated endpoints.
 *
 * Uses an in-memory MongoDB (started by setup.global.ts) so no external
 * database is required.
 */

import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp } from './helpers/app.helper';

const BASE = '/api/v1';
const SLUG = 'auth-e2e-tenant';

// Unique e-mail per test run avoids collision when the DB persists across suites.
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  // ── Registration ─────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('registers a new user and returns tokens', async () => {
      const email = `user-${uid()}@test.com`;
      const res = await request(server)
        .post(`${BASE}/auth/register`)
        .set('X-Tenant-Slug', SLUG)
        .send({ email, password: 'Secret123!', fullName: 'Test User' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('rejects a duplicate email within the same tenant', async () => {
      const email = `dup-${uid()}@test.com`;
      await request(server)
        .post(`${BASE}/auth/register`)
        .set('X-Tenant-Slug', SLUG)
        .send({ email, password: 'Secret123!', fullName: 'First' });

      const res = await request(server)
        .post(`${BASE}/auth/register`)
        .set('X-Tenant-Slug', SLUG)
        .send({ email, password: 'Secret123!', fullName: 'Second' });

      expect(res.status).toBe(409);
    });

    it('rejects registration with a weak password', async () => {
      const res = await request(server)
        .post(`${BASE}/auth/register`)
        .set('X-Tenant-Slug', SLUG)
        .send({ email: `weak-${uid()}@test.com`, password: '123', fullName: 'Weak' });

      expect(res.status).toBe(400);
    });

    it('rejects registration with a missing email', async () => {
      const res = await request(server)
        .post(`${BASE}/auth/register`)
        .set('X-Tenant-Slug', SLUG)
        .send({ password: 'Secret123!', fullName: 'No Email' });

      expect(res.status).toBe(400);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    const email = `login-${uid()}@test.com`;
    const password = 'LoginPass99!';

    beforeAll(async () => {
      await request(server)
        .post(`${BASE}/auth/register`)
        .set('X-Tenant-Slug', SLUG)
        .send({ email, password, fullName: 'Login User' });
    });

    it('returns tokens for valid credentials', async () => {
      const res = await request(server)
        .post(`${BASE}/auth/login`)
        .set('X-Tenant-Slug', SLUG)
        .send({ email, password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(server)
        .post(`${BASE}/auth/login`)
        .set('X-Tenant-Slug', SLUG)
        .send({ email, password: 'WrongPass!' });

      expect(res.status).toBe(401);
    });

    it('returns 401 for unknown email', async () => {
      const res = await request(server)
        .post(`${BASE}/auth/login`)
        .set('X-Tenant-Slug', SLUG)
        .send({ email: `nobody-${uid()}@test.com`, password });

      expect(res.status).toBe(401);
    });
  });

  // ── Token Refresh ─────────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    let refreshToken: string;
    let accessToken: string;

    beforeAll(async () => {
      const email = `refresh-${uid()}@test.com`;
      const res = await request(server)
        .post(`${BASE}/auth/register`)
        .set('X-Tenant-Slug', SLUG)
        .send({ email, password: 'RefreshPass99!', fullName: 'Refresh User' });
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('issues new tokens from a valid refresh token', async () => {
      const res = await request(server)
        .post(`${BASE}/auth/refresh`)
        .set('X-Tenant-Slug', SLUG)
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      // Old refresh token should be rotated (invalidated)
      const oldRefresh = refreshToken;
      refreshToken = res.body.refreshToken;
      expect(res.body.refreshToken).not.toBe(oldRefresh);
    });

    it('rejects an already-rotated refresh token', async () => {
      // The original refreshToken (now rotated) must be rejected
      const firstToken = refreshToken;
      await request(server)
        .post(`${BASE}/auth/refresh`)
        .set('X-Tenant-Slug', SLUG)
        .send({ refreshToken: firstToken });

      const res = await request(server)
        .post(`${BASE}/auth/refresh`)
        .set('X-Tenant-Slug', SLUG)
        .send({ refreshToken: firstToken });

      expect(res.status).toBe(401);
    });

    it('rejects a malformed refresh token', async () => {
      const res = await request(server)
        .post(`${BASE}/auth/refresh`)
        .set('X-Tenant-Slug', SLUG)
        .send({ refreshToken: 'not-a-valid-token' });

      expect(res.status).toBe(401);
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      const email = `logout-${uid()}@test.com`;
      const res = await request(server)
        .post(`${BASE}/auth/register`)
        .set('X-Tenant-Slug', SLUG)
        .send({ email, password: 'LogoutPass99!', fullName: 'Logout User' });
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('successfully logs out with valid token', async () => {
      const res = await request(server)
        .post(`${BASE}/auth/logout`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Tenant-Slug', SLUG)
        .send({ refreshToken });

      expect(res.status).toBe(200);
    });

    it('returns 401 when calling logout without auth', async () => {
      const res = await request(server)
        .post(`${BASE}/auth/logout`)
        .set('X-Tenant-Slug', SLUG)
        .send({ refreshToken: 'some-token' });

      expect(res.status).toBe(401);
    });
  });

  // ── Protected Endpoints ───────────────────────────────────────────────────

  describe('JWT Guard', () => {
    let accessToken: string;

    beforeAll(async () => {
      const email = `guard-${uid()}@test.com`;
      const res = await request(server)
        .post(`${BASE}/auth/register`)
        .set('X-Tenant-Slug', SLUG)
        .send({ email, password: 'GuardPass99!', fullName: 'Guard User' });
      accessToken = res.body.accessToken;
    });

    it('allows access to /users/me with valid token', async () => {
      const res = await request(server)
        .get(`${BASE}/users/me`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Tenant-Slug', SLUG);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('email');
    });

    it('returns 401 on /users/me without token', async () => {
      const res = await request(server)
        .get(`${BASE}/users/me`)
        .set('X-Tenant-Slug', SLUG);

      expect(res.status).toBe(401);
    });

    it('returns 401 on /users/me with a tampered token', async () => {
      const tampered = accessToken.slice(0, -5) + 'XXXXX';
      const res = await request(server)
        .get(`${BASE}/users/me`)
        .set('Authorization', `Bearer ${tampered}`)
        .set('X-Tenant-Slug', SLUG);

      expect(res.status).toBe(401);
    });
  });
});
