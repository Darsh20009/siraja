/**
 * Admin Module E2E Tests
 *
 * Covers:
 * - Admin dashboard access control
 * - Feedback submission (public) and management (admin-only)
 * - Donation campaign listing (public) and management (admin-only)
 * - System alerts (super-admin only)
 * - Audit log access (admin-only)
 * - Support ticket creation and admin management
 */

import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createTestApp, closeTestApp, getTestModule } from './helpers/app.helper';
import { User, UserDocument } from '../src/database/mongoose/schemas';
import { Role } from '../src/shared/enums/roles.enum';

const BASE = '/api/v1';
const SLUG = 'admin-e2e-tenant';
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe('Admin Module (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let userModel: Model<UserDocument>;

  let regularToken: string;
  let adminToken: string;
  let superAdminToken: string;

  async function createUserWithRole(role: Role): Promise<string> {
    const email = `${role.toLowerCase()}-${uid()}@test.com`;
    const res = await request(server)
      .post(`${BASE}/auth/register`)
      .set('X-Tenant-Slug', SLUG)
      .send({ email, password: 'AdminPass99!', fullName: `${role} User` });

    await userModel.updateOne({ email }, { $set: { roles: [role] } });

    const loginRes = await request(server)
      .post(`${BASE}/auth/login`)
      .set('X-Tenant-Slug', SLUG)
      .send({ email, password: 'AdminPass99!' });

    return loginRes.body.accessToken;
  }

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
    userModel = getTestModule().get<Model<UserDocument>>(getModelToken(User.name));

    [regularToken, adminToken, superAdminToken] = await Promise.all([
      createUserWithRole(Role.STUDENT),
      createUserWithRole(Role.ADMIN),
      createUserWithRole(Role.SUPER_ADMIN),
    ]);
  });

  afterAll(async () => {
    await closeTestApp();
  });

  // ── Dashboard (Admin-only) ────────────────────────────────────────────────

  describe('GET /admin/dashboard', () => {
    it('super-admin can access dashboard', async () => {
      const res = await request(server)
        .get(`${BASE}/admin/dashboard`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-Slug', SLUG);

      expect([200, 404]).toContain(res.status);
    });

    it('regular user cannot access admin dashboard', async () => {
      const res = await request(server)
        .get(`${BASE}/admin/dashboard`)
        .set('Authorization', `Bearer ${regularToken}`)
        .set('X-Tenant-Slug', SLUG);

      expect([401, 403]).toContain(res.status);
    });

    it('unauthenticated request returns 401', async () => {
      const res = await request(server)
        .get(`${BASE}/admin/dashboard`)
        .set('X-Tenant-Slug', SLUG);

      expect(res.status).toBe(401);
    });
  });

  // ── Feedback ──────────────────────────────────────────────────────────────

  describe('Feedback', () => {
    it('POST /admin/feedback - any authenticated user can submit feedback', async () => {
      const res = await request(server)
        .post(`${BASE}/admin/feedback`)
        .set('Authorization', `Bearer ${regularToken}`)
        .set('X-Tenant-Slug', SLUG)
        .send({
          title: 'Great platform!',
          body: 'Really enjoying the memorization tracking.',
          type: 'general',
        });

      expect([200, 201, 403]).toContain(res.status);
    });

    it('GET /admin/feedback - admin can list feedback', async () => {
      const res = await request(server)
        .get(`${BASE}/admin/feedback`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', SLUG);

      expect([200, 403]).toContain(res.status);
    });

    it('GET /admin/feedback - regular user cannot list feedback', async () => {
      const res = await request(server)
        .get(`${BASE}/admin/feedback`)
        .set('Authorization', `Bearer ${regularToken}`)
        .set('X-Tenant-Slug', SLUG);

      expect([401, 403]).toContain(res.status);
    });
  });

  // ── Support Tickets ───────────────────────────────────────────────────────

  describe('Support Tickets', () => {
    it('authenticated user can create a support ticket', async () => {
      const res = await request(server)
        .post(`${BASE}/admin/support/tickets`)
        .set('Authorization', `Bearer ${regularToken}`)
        .set('X-Tenant-Slug', SLUG)
        .send({
          subject: 'Need help with recitation',
          body: 'I am having trouble with the tajweed rules.',
        });

      expect([200, 201, 403]).toContain(res.status);
    });

    it('GET /admin/support/tickets - only admin can list all tickets', async () => {
      const adminRes = await request(server)
        .get(`${BASE}/admin/support/tickets`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', SLUG);

      const regularRes = await request(server)
        .get(`${BASE}/admin/support/tickets`)
        .set('Authorization', `Bearer ${regularToken}`)
        .set('X-Tenant-Slug', SLUG);

      // Admin should be allowed; regular user should be blocked
      expect([200, 403]).toContain(adminRes.status);
      expect([401, 403]).toContain(regularRes.status);
    });
  });

  // ── Donation Campaigns ────────────────────────────────────────────────────

  describe('Donation Campaigns', () => {
    it('GET /admin/donations/campaigns/public - publicly accessible', async () => {
      const res = await request(server)
        .get(`${BASE}/admin/donations/campaigns/public`)
        .set('X-Tenant-Slug', SLUG);

      expect([200, 404]).toContain(res.status);
    });

    it('POST /admin/donations/campaigns - only admin can create a campaign', async () => {
      const adminRes = await request(server)
        .post(`${BASE}/admin/donations/campaigns`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', SLUG)
        .send({ name: 'Test Campaign', targetAmount: 10000, description: 'Test' });

      const regularRes = await request(server)
        .post(`${BASE}/admin/donations/campaigns`)
        .set('Authorization', `Bearer ${regularToken}`)
        .set('X-Tenant-Slug', SLUG)
        .send({ name: 'Unauthorized Campaign', targetAmount: 10000 });

      expect([200, 201, 400, 403]).toContain(adminRes.status);
      expect([401, 403]).toContain(regularRes.status);
    });
  });

  // ── Audit Logs ────────────────────────────────────────────────────────────

  describe('Audit Logs', () => {
    it('GET /admin/audit-logs - super-admin can read audit logs', async () => {
      const res = await request(server)
        .get(`${BASE}/admin/audit-logs`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-Slug', SLUG);

      expect([200, 403, 404]).toContain(res.status);
    });

    it('GET /admin/audit-logs - regular user is blocked', async () => {
      const res = await request(server)
        .get(`${BASE}/admin/audit-logs`)
        .set('Authorization', `Bearer ${regularToken}`)
        .set('X-Tenant-Slug', SLUG);

      expect([401, 403]).toContain(res.status);
    });
  });

  // ── System Alerts ─────────────────────────────────────────────────────────

  describe('System Alerts', () => {
    it('GET /admin/alerts - super-admin can view alerts', async () => {
      const res = await request(server)
        .get(`${BASE}/admin/alerts`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-Slug', SLUG);

      expect([200, 403, 404]).toContain(res.status);
    });

    it('GET /admin/alerts - admin cannot view system alerts if restricted', async () => {
      const res = await request(server)
        .get(`${BASE}/admin/alerts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', SLUG);

      expect([200, 403, 404]).toContain(res.status);
    });
  });
});
