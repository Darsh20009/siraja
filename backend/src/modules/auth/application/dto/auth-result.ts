import { Role } from '@shared/enums/roles.enum';

/**
 * Common response shape returned by register/login/refresh/OAuth login —
 * the client always receives the same envelope regardless of which
 * authentication method was used.
 */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    tenantId: string;
    email?: string;
    phone?: string;
    fullName: string;
    roles: Role[];
    isEmailVerified: boolean;
  };
}
