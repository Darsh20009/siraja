/**
 * Phase 12A — Tenants Controller RBAC Enforcement Tests
 *
 * Verifies that each TenantsController handler carries the correct metadata
 * decorators that the global guard chain reads at runtime.
 *
 * Approach: we read decorator metadata directly using the NestJS Reflector
 * instead of spinning up a full HTTP server. This is the standard NestJS
 * unit-test pattern for verifying authorization annotations.
 */

import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@common/decorators/roles.decorator';
import { PERMISSIONS_KEY } from '@common/decorators/require-permissions.decorator';
import { Role } from '@shared/enums/roles.enum';
import { TenantsController } from './tenants.controller';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Returns the handler function on the controller prototype by method name. */
function getHandler(methodName: string) {
  return (TenantsController.prototype as any)[methodName] as Function;
}

/** Reads @Roles metadata from a controller method. */
function getRoles(methodName: string): Role[] | undefined {
  return Reflect.getMetadata(ROLES_KEY, getHandler(methodName));
}

/** Reads @RequirePermissions metadata from a controller method. */
function getPermissions(methodName: string): { keys: string[]; match: 'ALL' | 'ANY' } | undefined {
  return Reflect.getMetadata(PERMISSIONS_KEY, getHandler(methodName));
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('TenantsController — RBAC decorator coverage', () => {

  // ── POST /tenants ─────────────────────────────────────────────────────────

  describe('POST /tenants (create)', () => {
    it('restricts the route to SUPER_ADMIN role', () => {
      const roles = getRoles('create');
      expect(roles).toContain(Role.SUPER_ADMIN);
    });

    it('does NOT grant access to TENANT_ADMIN (role-based hard gate)', () => {
      const roles = getRoles('create') ?? [];
      expect(roles).not.toContain(Role.TENANT_ADMIN);
    });

    it('does NOT grant access to SHEIKH or STUDENT', () => {
      const roles = getRoles('create') ?? [];
      expect(roles).not.toContain(Role.SHEIKH);
      expect(roles).not.toContain(Role.STUDENT);
    });
  });

  // ── GET /tenants/current ──────────────────────────────────────────────────

  describe('GET /tenants/current (getCurrent)', () => {
    it('has no @Roles restriction — any authenticated user can read their tenant', () => {
      const roles = getRoles('getCurrent');
      // GET /tenants/current is intentionally open to all tenant members.
      expect(roles).toBeUndefined();
    });

    it('has no @RequirePermissions gate — read is implicitly allowed for all', () => {
      const perms = getPermissions('getCurrent');
      expect(perms).toBeUndefined();
    });
  });

  // ── PATCH /tenants/current ────────────────────────────────────────────────

  describe('PATCH /tenants/current (updateCurrent)', () => {
    it('requires the settings.update permission', () => {
      const perms = getPermissions('updateCurrent');
      expect(perms).toBeDefined();
      expect(perms!.keys).toContain('settings.update');
    });

    it('has no extra @Roles gate (permission check is sufficient)', () => {
      const roles = getRoles('updateCurrent');
      expect(roles).toBeUndefined();
    });
  });

  // ── PATCH /tenants/current/settings ───────────────────────────────────────

  describe('PATCH /tenants/current/settings (updateCurrentSettings)', () => {
    it('requires the settings.update permission', () => {
      const perms = getPermissions('updateCurrentSettings');
      expect(perms).toBeDefined();
      expect(perms!.keys).toContain('settings.update');
    });
  });

  // ── GET /tenants/current/logo-upload-url ──────────────────────────────────

  describe('GET /tenants/current/logo-upload-url (getLogoUploadUrl)', () => {
    it('requires the settings.update permission', () => {
      const perms = getPermissions('getLogoUploadUrl');
      expect(perms).toBeDefined();
      expect(perms!.keys).toContain('settings.update');
    });
  });
});

// ─── RolesGuard behaviour simulation ─────────────────────────────────────────
//
// We simulate the RolesGuard canActivate logic directly to prove that
// non-SUPER_ADMIN users are blocked at the POST /tenants route.

describe('RolesGuard simulation for POST /tenants', () => {
  /** Minimal RolesGuard canActivate logic extracted from the real guard. */
  function canActivateRoles(
    requiredRoles: Role[],
    userRoles: Role[],
  ): boolean {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.some((r) => userRoles.includes(r));
  }

  const requiredRoles = getRoles('create') ?? [];

  it('allows SUPER_ADMIN', () => {
    expect(canActivateRoles(requiredRoles, [Role.SUPER_ADMIN])).toBe(true);
  });

  it('blocks TENANT_ADMIN', () => {
    expect(canActivateRoles(requiredRoles, [Role.TENANT_ADMIN])).toBe(false);
  });

  it('blocks SHEIKH', () => {
    expect(canActivateRoles(requiredRoles, [Role.SHEIKH])).toBe(false);
  });

  it('blocks STUDENT', () => {
    expect(canActivateRoles(requiredRoles, [Role.STUDENT])).toBe(false);
  });

  it('blocks PARENT', () => {
    expect(canActivateRoles(requiredRoles, [Role.PARENT])).toBe(false);
  });

  it('blocks SUPERVISOR', () => {
    expect(canActivateRoles(requiredRoles, [Role.SUPERVISOR])).toBe(false);
  });

  it('blocks an empty roles array (unauthenticated / missing roles claim)', () => {
    expect(canActivateRoles(requiredRoles, [])).toBe(false);
  });
});
