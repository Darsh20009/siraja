import { Role } from '../enums/roles.enum';

/**
 * Shape of the JWT access/refresh token payload.
 * Carries tenant scope so every authenticated request is tenant-aware.
 */
export interface JwtPayload {
  sub: string; // user id
  tenantId: string;
  role: Role;
  iat?: number;
  exp?: number;
}
