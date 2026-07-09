import { Role } from '../enums/roles.enum';

/**
 * Shape of the JWT access/refresh token payload.
 * Carries tenant scope so every authenticated request is tenant-aware.
 */
export interface JwtPayload {
  sub: string; // user id
  tenantId: string;
  // Non-empty — a user may hold more than one role (see `User.roles` on
  // the `User` schema); every RBAC guard/resolver reads this array, not
  // a single role, so this must never be narrowed back to `role: Role`.
  roles: Role[];
  iat?: number;
  exp?: number;
}
