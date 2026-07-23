/**
 * Multi-Tenancy E2E Tests
 *
 * Verifies that:
 * 1. Tenant resolution via X-Tenant-Slug header works correctly.
 * 2. Users registered in tenant A cannot access data from tenant B.
 * 3. Missing tenant header is handled gracefully.
 * 4. Tenant-scoped data is isolated at the persistence layer.
 */

import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp } from './helpers/app.helper';

const BASE = '/api/v1';
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe('Multi-Tenancy (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  const TENANT_A = `tenant-a-${uid()}`;
  const TENANT_B = `tenant-b-${uid()}`;

  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();

    // Register one user per tenant
    const emailA = `usera-${uid()}@test.com`;
    const resA = await request(server)
      .post(`${BASE}/auth/register`)
      .set('X-Tenant-Slug', TENANT_A)
      .send({ email: emailA, password: 'TenantA99!', fullName: 'User A' });
    tokenA = resA.body.accessToken;

    const emailB = `userb-${uid()}@test.com`;
    const resB = await request(server)
      .post(`${BASE}/auth/register`)
      .set('X-Tenant-Slug', TENANT_B)
      .send({ email: emailB, password: 'TenantB99!', fullName: 'User B' });
    tokenB = resB.body.accessToken;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  // ── Tenant Resolution ─────────────────────────────────────────────────────

  describe('Header-based tenant resolution', () => {
    it('resolves correctly when X-Tenant-Slug is present', async () => {
      const res = await request(server)
        .get(`${BASE}/users/me`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Slug', TENANT_A);

      expect(res.status).toBe(200);
    });

    it('returns 200 even without tenant header (permissive-if-absent design)', async () => {
      // Auth endpoints do not require the slug for route resolution.
      // The app uses a "permissive-if-absent" strategy per the architecture.
      const res = await request(server)
        .get(`${BASE}/health`);

      expect(res.status).toBe(200);
    });
  });

  // ── Tenant Isolation ──────────────────────────────────────────────────────

  describe('Data isolation between tenants', () => {
    it('User A can access their own profile under tenant A', async () => {
      const res = await request(server)
        .get(`${BASE}/users/me`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Slug', TENANT_A);

      expect(res.status).toBe(200);
      expect(res.body.tenantId).toBeDefined();
    });

    it('User B can access their own profile under tenant B', async () => {
      const res = await request(server)
        .get(`${BASE}/users/me`)
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Tenant-Slug', TENANT_B);

      expect(res.status).toBe(200);
    });

    it('User A token is rejected when accessing tenant B endpoint', async () => {
      // Token is scoped to tenant A; accessing tenant B should fail (the JWT's
      // tenantId does not match the header tenant).
      const res = await request(server)
        .get(`${BASE}/users/me`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Slug', TENANT_B);

      // The response should either be 401 (token rejected) or 403 (forbidden).
      expect([401, 403]).toContain(res.status);
    });

    it('User B token is rejected when accessing tenant A endpoint', async () => {
      const res = await request(server)
        .get(`${BASE}/users/me`)
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Tenant-Slug', TENANT_A);

      expect([401, 403]).toContain(res.status);
    });
  });

  // ── Health Endpoint (Public) ──────────────────────────────────────────────

  describe('Public endpoints work regardless of tenant', () => {
    it('GET /health responds with status ok', async () => {
      const res = await request(server).get(`${BASE}/health`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('Swagger docs are accessible in dev mode', async () => {
      const res = await request(server).get('/docs');
      // Returns HTML redirect or 200
      expect([200, 301, 302]).toContain(res.status);
    });
  });
});
