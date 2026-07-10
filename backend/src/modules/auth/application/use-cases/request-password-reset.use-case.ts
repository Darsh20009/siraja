import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { AuditAction } from '@shared/enums/audit.enum';
import { TokenPurpose } from '@shared/enums/token-purpose.enum';
import {
  IUserAuthRepository,
  USER_AUTH_REPOSITORY,
} from '../../domain/repositories/user-auth.repository.interface';
import {
  IVerificationTokenRepository,
  VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/verification-token.repository.interface';
import { TokenService } from '../../infrastructure/services/token.service';
import { MailerService } from '../../infrastructure/services/mailer.service';
import { AuthAuditService } from '../../infrastructure/services/audit.service';

/**
 * Email-only account recovery (Phase 4 scope — no SMS reset).
 * Deliberately never reveals whether the email exists: always resolves
 * successfully from the caller's perspective, only sending mail (and
 * writing the token) when a matching, non-deleted account is found —
 * prevents account enumeration via the password-reset endpoint.
 */
@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_AUTH_REPOSITORY) private readonly users: IUserAuthRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly verificationTokens: IVerificationTokenRepository,
    private readonly tokenService: TokenService,
    private readonly mailer: MailerService,
    private readonly audit: AuthAuditService,
    private readonly configService: ConfigService,
  ) {}

  async execute(tenantId: Types.ObjectId | string, email: string, ipAddress: string): Promise<void> {
    const user = await this.users.findByEmail(tenantId, email);
    if (!user) return; // do not reveal account existence

    await this.verificationTokens.invalidateAllForUser(user._id as Types.ObjectId, TokenPurpose.PASSWORD_RESET);
    const { raw, hash } = this.tokenService.generateEmailToken();
    await this.verificationTokens.create({
      tenantId,
      userId: user._id as Types.ObjectId,
      purpose: TokenPurpose.PASSWORD_RESET,
      tokenHash: hash,
      email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h — shorter than email verification
      requestIpAddress: ipAddress,
    });

    await this.mailer.sendPasswordResetEmail(email, raw, this.configService.get<string>('appUrl') || '');
    await this.audit.record({
      tenantId,
      actor: user._id as Types.ObjectId,
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      entityId: user._id as Types.ObjectId,
      ipAddress,
    });
  }
}
