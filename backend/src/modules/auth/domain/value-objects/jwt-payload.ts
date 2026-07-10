import { Role } from '@shared/enums/roles.enum';

/**
 * Shape encoded into the access token. Every downstream guard
 * (`JwtAuthGuard` → `request.user`) relies on this exact shape, so
 * changing it is a breaking change for `PermissionsGuard`/
 * `TenantScopeGuard`/`ResourceOwnershipGuard` (Phase 3).
 */
export interface AccessTokenPayload {
  sub: string; // user id
  tenantId: string;
  roles: Role[];
  email?: string;
  sessionId: string; // refresh token document id this access token was minted alongside — lets a session be revoked and its short-lived access tokens rejected on the next auth check via a denylist, if ever needed
}

/**
 * Refresh tokens are opaque, high-entropy random strings on the wire
 * (see `TokenService.generateOpaqueToken`) — never JWTs — precisely so
 * they carry no introspectable claims and can only be used against the
 * `refresh_tokens` collection they hash to. This type exists only to
 * document the internal bookkeeping fields attached to one.
 */
export interface RefreshTokenContext {
  userId: string;
  deviceId: string;
  familyId: string;
}
