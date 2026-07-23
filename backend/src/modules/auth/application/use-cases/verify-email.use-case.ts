import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuditAction } from '@shared/enums/audit.enum';
import { UserStatus } from '@shared/enums/user-status.enum';
import { TokenPurpose } from '@shared/enums/token-purpose.enum';
import {
  IVerificationTokenRepository,
  VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/verification-token.repository.interface';
import {
  IUserAuthRepository,
  USER_AUTH_REPOSITORY,
} from '../../domain/repositories/user-auth.repository.interface';
import { TokenService } from '../../infrastructure/services/token.service';
import { AuthAuditService } from '../../infrastructure/services/audit.service';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly verificationTokens: IVerificationTokenRepository,
    @Inject(USER_AUTH_REPOSITORY) private readonly users: IUserAuthRepository,
    private readonly tokenService: TokenService,
    private readonly audit: AuthAuditService,
  ) {}

  async execute(rawToken: string, ipAddress: string): Promise<void> {
    const tokenHash = this.tokenService.hashToken(rawToken);
    const record = await this.verificationTokens.findActiveByHash(tokenHash, TokenPurpose.EMAIL_VERIFICATION);
    if (!record) {
      throw new BadRequestException('This verification link is invalid or has expired.');
    }

    await this.verificationTokens.consume(record._id as Types.ObjectId);
    const user = await this.users.updateById(record.userId, {
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
    });

    if (user) {
      await this.audit.record({
        tenantId: record.tenantId,
        actor: user._id as Types.ObjectId,
        action: AuditAction.EMAIL_VERIFIED,
        entityId: user._id as Types.ObjectId,
        ipAddress,
      });
    }
  }
}
