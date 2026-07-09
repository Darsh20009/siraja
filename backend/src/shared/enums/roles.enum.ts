/**
 * Platform-wide user roles.
 * Role-based access control (RBAC) is enforced via RolesGuard
 * (see common/guards) against this enum.
 */
export enum Role {
  SUPER_ADMIN = 'super_admin',
  TENANT_ADMIN = 'tenant_admin',
  SUPERVISOR = 'supervisor',
  SHEIKH = 'sheikh',
  PARENT = 'parent',
  STUDENT = 'student',
}
