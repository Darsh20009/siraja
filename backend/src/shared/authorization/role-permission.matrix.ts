import { Role } from '@shared/enums/roles.enum';
import { PermissionCategory } from '@shared/enums/permission-category.enum';
import { PermissionAction } from '@shared/enums/permission-action.enum';
import { PERMISSION_REGISTRY, PERMISSION_KEYS } from './permission-registry';

/**
 * THE ROLE → PERMISSION MATRIX
 * =============================
 * Default permission keys granted to each system role. This is the
 * baseline every tenant is seeded with (Phase 4: tenant provisioning
 * will materialize these into `roles` documents per tenant, per Phase 2's
 * `Role` schema). Tenant admins may later compose additional **custom
 * roles** from the same `PERMISSION_REGISTRY` — this matrix only defines
 * the six fixed system roles.
 *
 * `Role.SUPER_ADMIN` intentionally has an empty entry here: Super Admin
 * **bypasses permission checks entirely** (see `PermissionsGuard`) rather
 * than being granted every key explicitly — bypass, not a very long
 * grant list, is the correct model for "can do anything, including
 * future permissions that don't exist yet."
 */

function all(category: PermissionCategory): string[] {
  return PERMISSION_REGISTRY.filter((d) => d.category === category).map((d) => d.key);
}

function pick(category: PermissionCategory, actions: PermissionAction[]): string[] {
  return actions.map((action) => `${category}.${action}`).filter((key) => PERMISSION_KEYS.has(key));
}

const { CREATE, READ, UPDATE, DELETE, EXPORT, APPROVE, ASSIGN } = PermissionAction;
const C = PermissionCategory;

export const ROLE_PERMISSION_MATRIX: Record<Role, string[]> = {
  // Bypasses the permission system entirely — see PermissionsGuard.
  [Role.SUPER_ADMIN]: [],

  // Full control within the tenant boundary (tenant boundary itself is
  // enforced separately by TenantScopeGuard, not by this matrix).
  [Role.TENANT_ADMIN]: PERMISSION_REGISTRY.map((d) => d.key),

  [Role.SUPERVISOR]: [
    ...pick(C.STUDENTS, [READ]),
    ...pick(C.SHEIKHS, [READ]),
    ...pick(C.GROUPS, [READ, UPDATE, ASSIGN]),
    ...pick(C.SESSIONS, [READ, UPDATE]),
    ...pick(C.ATTENDANCE, [READ, EXPORT]),
    ...pick(C.MEMORIZATION, [READ, APPROVE]),
    ...pick(C.REVIEWS, [READ, APPROVE]),
    ...pick(C.EXAMS, [READ, APPROVE]),
    ...pick(C.ASSIGNMENTS, [READ, APPROVE]),
    ...pick(C.REPORTS, [READ, EXPORT]),
    ...pick(C.NOTIFICATIONS, [CREATE, READ]),
    ...pick(C.SUPPORT, [CREATE, READ]),
  ],

  [Role.SHEIKH]: [
    ...pick(C.STUDENTS, [READ]),
    ...pick(C.GROUPS, [READ]),
    ...pick(C.SESSIONS, [CREATE, READ, UPDATE]),
    ...pick(C.ATTENDANCE, [CREATE, READ, UPDATE]),
    ...pick(C.MEMORIZATION, [CREATE, READ, UPDATE, APPROVE]),
    ...pick(C.REVIEWS, [CREATE, READ, UPDATE, APPROVE]),
    ...pick(C.EXAMS, [CREATE, READ, UPDATE, APPROVE]),
    ...pick(C.ASSIGNMENTS, [CREATE, READ, UPDATE, APPROVE]),
    ...pick(C.NOTIFICATIONS, [CREATE, READ]),
    ...pick(C.SUPPORT, [CREATE, READ]),
  ],

  [Role.PARENT]: [
    ...pick(C.STUDENTS, [READ]),
    ...pick(C.ATTENDANCE, [READ]),
    ...pick(C.MEMORIZATION, [READ]),
    ...pick(C.REVIEWS, [READ]),
    ...pick(C.EXAMS, [READ]),
    ...pick(C.ASSIGNMENTS, [READ]),
    ...pick(C.NOTIFICATIONS, [READ]),
    ...pick(C.SUPPORT, [CREATE, READ]),
  ],

  [Role.STUDENT]: [
    ...pick(C.ATTENDANCE, [READ]),
    ...pick(C.MEMORIZATION, [READ]),
    ...pick(C.REVIEWS, [READ]),
    ...pick(C.EXAMS, [READ]),
    ...pick(C.ASSIGNMENTS, [READ]),
    ...pick(C.NOTIFICATIONS, [READ]),
    ...pick(C.SUPPORT, [CREATE, READ]),
  ],
};

// Guard against typos: every key placed in the matrix above must exist in
// the registry (fails fast at module load in dev/test, not silently).
for (const [role, keys] of Object.entries(ROLE_PERMISSION_MATRIX)) {
  for (const key of keys) {
    if (!PERMISSION_KEYS.has(key)) {
      throw new Error(`ROLE_PERMISSION_MATRIX["${role}"] references unknown permission key "${key}"`);
    }
  }
}

/** Unused export kept for symmetry/future custom-role composition helpers. */
export const allPermissionsFor = all;
