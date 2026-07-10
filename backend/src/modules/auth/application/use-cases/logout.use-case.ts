import { Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuditAction } from '@shared/enums/audit.enum';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import { TokenService } from '../../infrastructure/services/token.service';
import { AuthAuditService } from '../../infrastructure/services/audit.service';

/** Logout revokes only the presented session's refresh token — other devices stay logged in. */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: IRefreshTokenRepository,
    private readonly tokenService: TokenService,
    private readonly audit: AuthAuditService,
  ) {}

  async execute(rawRefreshToken: string, userId: string, tenantId: string, ipAddress: string): Promise<void> {
    const tokenHash = this.tokenService.hashToken(rawRefreshToken);
    const existing = await this.refreshTokens.findActiveByHash(tokenHash);
    if (existing && !existing.revokedAt) {
      await this.refreshTokens.revokeById(existing._id as any, 'logout');
    }
    await this.audit.record({
      tenantId,
      actor: userId as unknown as Types.ObjectId,
      action: AuditAction.LOGOUT,
      entityId: userId as unknown as Types.ObjectId,
      ipAddress,
    });
  }
}
