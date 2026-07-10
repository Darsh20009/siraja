import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuditAction } from '@shared/enums/audit.enum';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import {
  IUserAuthRepository,
  USER_AUTH_REPOSITORY,
} from '../../domain/repositories/user-auth.repository.interface';
import { TokenService } from '../../infrastructure/services/token.service';
import { AuthAuditService } from '../../infrastructure/services/audit.service';
import { AuthResult } from '../dto/auth-result';

/**
 * Refresh Token Rotation (see docs/architecture/10-authentication-blueprint.md
 * §Token Strategy):
 *   1. Hash the presented raw token, look up the matching document.
 *   2. Not found → reject outright (never issued, or long since purged by TTL).
 *   3. Found but already revoked → **reuse detected**: the same token
 *      was rotated once already and is now being replayed (e.g. an
 *      attacker who stole an old token from a compromised device, or a
 *      network retry racing a legitimate rotation). Revoke the entire
 *      rotation family as a precaution and force the user to
 *      re-authenticate on every device in that chain.
 *   4. Found, active, expired → reject (TTL index will eventually purge it).
 *   5. Found, active, valid → atomically revoke it (`replacedByTokenId`
 *      pointing at the new one) and mint a new refresh token in the same
 *      `familyId`, plus a fresh access token.
 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: IRefreshTokenRepository,
    @Inject(USER_AUTH_REPOSITORY) private readonly users: IUserAuthRepository,
    private readonly tokenService: TokenService,
    private readonly audit: AuthAuditService,
  ) {}

  async execute(rawRefreshToken: string, ipAddress: string, userAgent?: string): Promise<AuthResult> {
    const tokenHash = this.tokenService.hashToken(rawRefreshToken);
    const existing = await this.refreshTokens.findActiveByHash(tokenHash);

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (existing.revokedAt) {
      await this.refreshTokens.revokeFamily(existing.familyId as string, 'reuse_detected');
      await this.audit.record({
        tenantId: existing.tenantId,
        actor: existing.userId,
        action: AuditAction.TOKEN_REUSE_DETECTED,
        entityId: existing.userId,
        ipAddress,
      });
      throw new UnauthorizedException('This session is no longer valid. Please log in again.');
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired. Please log in again.');
    }

    const user = await this.users.findById(existing.userId);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }

    const newRawToken = this.tokenService.generateOpaqueToken();
    const newToken = await this.refreshTokens.create({
      tenantId: existing.tenantId,
      userId: existing.userId,
      deviceId: existing.deviceId,
      tokenHash: this.tokenService.hashToken(newRawToken),
      familyId: existing.familyId as string,
      expiresAt: new Date(Date.now() + this.tokenService.getRefreshTokenTtlMs()),
      ipAddress,
      userAgent,
    });

    await this.refreshTokens.revokeById(existing._id as any, 'rotated', newToken._id as any);

    await this.audit.record({
      tenantId: existing.tenantId,
      actor: existing.userId,
      action: AuditAction.TOKEN_REFRESHED,
      entityId: existing.userId,
      ipAddress,
    });

    const accessToken = this.tokenService.signAccessToken({
      sub: String(user._id),
      tenantId: String(user.tenantId),
      roles: user.roles,
      email: user.email,
      sessionId: String(newToken._id),
    });

    return {
      accessToken,
      refreshToken: newRawToken,
      user: {
        id: String(user._id),
        tenantId: String(user.tenantId),
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }
}
