import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export interface PermissionsMetadata {
  keys: string[];
  match: 'ALL' | 'ANY';
}

/**
 * Requires the caller's effective permission set (role + tenant Role
 * overrides + direct UserPermission grants/revocations, see
 * `PermissionResolverService`) to contain every one of `keys`.
 * `Role.SUPER_ADMIN` always bypasses this check (see `PermissionsGuard`).
 *
 *   @RequirePermissions(PERMISSIONS.STUDENTS.CREATE)
 *   @RequirePermissions(PERMISSIONS.STUDENTS.READ, PERMISSIONS.REPORTS.EXPORT)
 */
export const RequirePermissions = (...keys: string[]) =>
  SetMetadata(PERMISSIONS_KEY, { keys, match: 'ALL' } as PermissionsMetadata);

/**
 * Same as `RequirePermissions`, but passes if the caller holds ANY one of
 * `keys` rather than all of them.
 *
 *   @RequireAnyPermission(PERMISSIONS.EXAMS.APPROVE, PERMISSIONS.REVIEWS.APPROVE)
 */
export const RequireAnyPermission = (...keys: string[]) =>
  SetMetadata(PERMISSIONS_KEY, { keys, match: 'ANY' } as PermissionsMetadata);
