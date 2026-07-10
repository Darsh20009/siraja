import { Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuditAction } from '@shared/enums/audit.enum';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import { AuthAuditService } from '../../infrastructure/services/audit.service';

/** "Log out everywhere" — revokes every active session/refresh token for the user across all devices. */
@Injectable()
export class LogoutAllUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: IRefreshTokenRepository,
    private readonly audit: AuthAuditService,
  ) {}

  async execute(userId: string, tenantId: string, ipAddress: string): Promise<void> {
    await this.refreshTokens.revokeAllForUser(userId, 'logout_all');
    await this.audit.record({
      tenantId,
      actor: userId as unknown as Types.ObjectId,
      action: AuditAction.LOGOUT_ALL,
      entityId: userId as unknown as Types.ObjectId,
      ipAddress,
    });
  }
}
