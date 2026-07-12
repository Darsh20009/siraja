import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantScopeGuard } from './tenant-scope.guard';
import { Role } from '@shared/enums/roles.enum';
import { IS_PUBLIC_KEY } from '@modules/auth/infrastructure/decorators/public.decorator';

// ─── helpers ────────────────────────────────────────────────────────────────

interface CtxOptions {
  isPublic?: boolean;
  user?: { sub: string; tenantId: string; roles: Role[] } | null;
  resolvedTenantId?: string | null;  // null = no header, string = resolved id
  bodyTenantId?: string;
  queryTenantId?: string;
}

function makeCtx(opts: CtxOptions = {}): ExecutionContext {
  const request: any = {
    user: opts.user ?? null,
    tenant: opts.resolvedTenantId ? { id: opts.resolvedTenantId } : undefined,
    body: opts.bodyTenantId ? { tenantId: opts.bodyTenantId } : {},
    query: opts.queryTenantId ? { tenantId: opts.queryTenantId } : {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('TenantScopeGuard', () => {
  let reflector: Reflector;
  let guard: TenantScopeGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new TenantScopeGuard(reflector);
  });

  // ── Public routes bypass ───────────────────────────────────────────────────

  describe('@Public() routes', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) =>
        key === IS_PUBLIC_KEY ? true : undefined,
      );
    });

    it('returns true for a public route even with no user or tenant', () => {
      const ctx = makeCtx({ user: null, resolvedTenantId: null });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('returns true for a public route even when tenants mismatch', () => {
      const ctx = makeCtx({
        user: { sub: 'u1', tenantId: 'A', roles: [Role.TENANT_ADMIN] },
        resolvedTenantId: 'B',
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // ── SUPER_ADMIN bypass ────────────────────────────────────────────────────

  describe('SUPER_ADMIN bypass', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    });

    it('returns true for SUPER_ADMIN even when tenant IDs differ (cross-tenant operation)', () => {
      const ctx = makeCtx({
        user: { sub: 'admin', tenantId: 'platform', roles: [Role.SUPER_ADMIN] },
        resolvedTenantId: 'tenant-X',
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('returns true for SUPER_ADMIN when no X-Tenant-Slug header was sent', () => {
      const ctx = makeCtx({
        user: { sub: 'admin', tenantId: 'platform', roles: [Role.SUPER_ADMIN] },
        resolvedTenantId: null,
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('returns true for SUPER_ADMIN with multiple roles including SUPER_ADMIN', () => {
      const ctx = makeCtx({
        user: { sub: 'admin', tenantId: 'platform', roles: [Role.SUPER_ADMIN, Role.TENANT_ADMIN] },
        resolvedTenantId: 'any-tenant',
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // ── No authenticated user ─────────────────────────────────────────────────

  describe('Unauthenticated requests', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    });

    it('returns false when no user is on the request (JwtAuthGuard must run first)', () => {
      const ctx = makeCtx({ user: null, resolvedTenantId: 'tenant-A' });
      expect(guard.canActivate(ctx)).toBe(false);
    });
  });

  // ── #4  Absent tenant ─────────────────────────────────────────────────────

  describe('Missing resolved tenant', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    });

    it('throws ForbiddenException when no tenant was resolved and user is not SUPER_ADMIN', () => {
      const ctx = makeCtx({
        user: { sub: 'u1', tenantId: 'tenant-A', roles: [Role.TENANT_ADMIN] },
        resolvedTenantId: null,
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for a SHEIKH with no resolved tenant', () => {
      const ctx = makeCtx({
        user: { sub: 'u2', tenantId: 'tenant-A', roles: [Role.SHEIKH] },
        resolvedTenantId: null,
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  // ── #1  Same-tenant access ────────────────────────────────────────────────

  describe('Same-tenant access (allowed)', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    });

    it('returns true when user.tenantId matches the resolved tenant', () => {
      const ctx = makeCtx({
        user: { sub: 'u1', tenantId: 'tenant-A', roles: [Role.TENANT_ADMIN] },
        resolvedTenantId: 'tenant-A',
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('returns true for SHEIKH within the same tenant', () => {
      const ctx = makeCtx({
        user: { sub: 'u2', tenantId: 'tenant-B', roles: [Role.SHEIKH] },
        resolvedTenantId: 'tenant-B',
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('returns true for STUDENT within the same tenant', () => {
      const ctx = makeCtx({
        user: { sub: 'u3', tenantId: 'tenant-C', roles: [Role.STUDENT] },
        resolvedTenantId: 'tenant-C',
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('returns true for a user with multiple non-admin roles in the same tenant', () => {
      const ctx = makeCtx({
        user: { sub: 'u4', tenantId: 'tenant-A', roles: [Role.SHEIKH, Role.SUPERVISOR] },
        resolvedTenantId: 'tenant-A',
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('returns true when body.tenantId also matches the resolved tenant', () => {
      const ctx = makeCtx({
        user: { sub: 'u1', tenantId: 'tenant-A', roles: [Role.TENANT_ADMIN] },
        resolvedTenantId: 'tenant-A',
        bodyTenantId: 'tenant-A',
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('returns true when query.tenantId also matches the resolved tenant', () => {
      const ctx = makeCtx({
        user: { sub: 'u1', tenantId: 'tenant-A', roles: [Role.PARENT] },
        resolvedTenantId: 'tenant-A',
        queryTenantId: 'tenant-A',
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // ── #2  Cross-tenant prevention ───────────────────────────────────────────

  describe('Cross-tenant prevention (blocked)', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    });

    it('throws ForbiddenException when user.tenantId differs from the resolved tenant', () => {
      const ctx = makeCtx({
        user: { sub: 'u1', tenantId: 'tenant-A', roles: [Role.TENANT_ADMIN] },
        resolvedTenantId: 'tenant-B',
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for a cross-tenant token replay by a SHEIKH', () => {
      const ctx = makeCtx({
        user: { sub: 'u2', tenantId: 'tenant-A', roles: [Role.SHEIKH] },
        resolvedTenantId: 'tenant-B',
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when body.tenantId smuggles a different tenant id', () => {
      const ctx = makeCtx({
        user: { sub: 'u1', tenantId: 'tenant-A', roles: [Role.TENANT_ADMIN] },
        resolvedTenantId: 'tenant-A',
        bodyTenantId: 'tenant-B',  // payload injection attempt
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when query.tenantId smuggles a different tenant id', () => {
      const ctx = makeCtx({
        user: { sub: 'u1', tenantId: 'tenant-A', roles: [Role.STUDENT] },
        resolvedTenantId: 'tenant-A',
        queryTenantId: 'tenant-C',  // query param injection attempt
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for a PARENT trying to cross tenant boundary', () => {
      const ctx = makeCtx({
        user: { sub: 'u3', tenantId: 'tenant-X', roles: [Role.PARENT] },
        resolvedTenantId: 'tenant-Y',
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });
});
