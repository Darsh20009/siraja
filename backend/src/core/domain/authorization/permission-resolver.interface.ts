/**
 * Domain contract for resolving a user's effective permissions.
 * Framework-agnostic — infrastructure (Mongoose-backed) implementations
 * live in `core/infrastructure/authorization/permission-resolver.service.ts`.
 *
 * "Effective" permissions combine three sources, in this precedence:
 *   1. Role permissions — every role in `user.roles` (multi-role support),
 *      unioned, resolved via ROLE_PERMISSION_MATRIX for system roles or
 *      the tenant's `Role.permissionKeys` for custom roles.
 *   2. Direct grants — `UserPermission` documents with `isGranted: true`
 *      add to the set on top of role permissions.
 *   3. Direct revocations — `UserPermission` documents with
 *      `isGranted: false` remove from the set, even if a role grants it.
 *      Revocation always wins over both role and direct grants.
 */
export interface EffectivePermissions {
  userId: string;
  tenantId: string;
  /** True only for Role.SUPER_ADMIN — short-circuits every permission check. */
  isSuperAdmin: boolean;
  /** Every role currently held by the user (supports multiple roles per user). */
  roles: string[];
  /** Final, precedence-resolved set of permission keys, e.g. "students.create". */
  permissionKeys: ReadonlySet<string>;
}

export interface IPermissionResolver {
  /**
   * Resolves the full effective permission set for a user within a
   * tenant. Implementations should be cache-friendly (called on every
   * authorized request) — see `PermissionContext` for the per-request
   * memoization contract.
   */
  resolveForUser(userId: string, tenantId: string): Promise<EffectivePermissions>;

  /** Convenience check: does the user's effective set satisfy `requiredKeys`? */
  hasPermissions(
    effective: EffectivePermissions,
    requiredKeys: string[],
    match: 'ALL' | 'ANY',
  ): boolean;
}

export const PERMISSION_RESOLVER = Symbol('PERMISSION_RESOLVER');
