import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditAction } from '@shared/enums/audit.enum';
import { TokenPurpose } from '@shared/enums/token-purpose.enum';
import { PasswordHistory, PasswordHistoryDocument } from '@database/mongoose/schemas';
import {
  IVerificationTokenRepository,
  VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/verification-token.repository.interface';
import {
  IUserAuthRepository,
  USER_AUTH_REPOSITORY,
} from '../../domain/repositories/user-auth.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import { TokenService } from '../../infrastructure/services/token.service';
import { PasswordService } from '../../infrastructure/services/password.service';
import { AuthAuditService } from '../../infrastructure/services/audit.service';

const PASSWORD_HISTORY_DEPTH = 5;

/**
 * Password Reset Flow completion — also demonstrates Password History
 * enforcement (reused by a future "change password while logged in"
 * flow, not built this phase since it wasn't requested): reject reuse of
 * any of the last N hashes, then archive the outgoing hash before
 * overwriting it. On successful reset, every active session is revoked
 * — a stolen-then-recovered account should not leave the attacker's
 * session alive.
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly verificationTokens: IVerificationTokenRepository,
    @Inject(USER_AUTH_REPOSITORY) private readonly users: IUserAuthRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: IRefreshTokenRepository,
    @InjectModel(PasswordHistory.name) private readonly passwordHistoryModel: Model<PasswordHistoryDocument>,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly audit: AuthAuditService,
  ) {}

  async execute(rawToken: string, newPassword: string, ipAddress: string): Promise<void> {
    const tokenHash = this.tokenService.hashToken(rawToken);
    const record = await this.verificationTokens.findActiveByHash(tokenHash, TokenPurpose.PASSWORD_RESET);
    if (!record) {
      throw new BadRequestException('This password reset link is invalid or has expired.');
    }

    const user = await this.users.findById(record.userId);
    if (!user) throw new BadRequestException('Account no longer exists.');

    this.passwordService.assertStrongEnough(newPassword);

    const recentHashes = await this.passwordHistoryModel
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(PASSWORD_HISTORY_DEPTH)
      .select('+passwordHash')
      .exec();
    for (const entry of recentHashes) {
      if (await this.passwordService.verify(entry.passwordHash, newPassword)) {
        throw new BadRequestException(`Cannot reuse any of your last ${PASSWORD_HISTORY_DEPTH} passwords.`);
      }
    }
    if (user.passwordHash && (await this.passwordService.verify(user.passwordHash, newPassword))) {
      throw new BadRequestException('New password must be different from your current password.');
    }

    const newHash = await this.passwordService.hash(newPassword);
    if (user.passwordHash) {
      await this.passwordHistoryModel.create({
        tenantId: user.tenantId,
        userId: user._id,
        passwordHash: user.passwordHash,
      });
    }

    await this.users.updateById(user._id as Types.ObjectId, {
      passwordHash: newHash,
      failedLoginCount: 0,
      lockedUntil: null,
    });

    await this.verificationTokens.consume(record._id as Types.ObjectId);
    await this.refreshTokens.revokeAllForUser(user._id as Types.ObjectId, 'password_changed');

    await this.audit.record({
      tenantId: record.tenantId,
      actor: user._id as Types.ObjectId,
      action: AuditAction.PASSWORD_RESET_COMPLETED,
      entityId: user._id as Types.ObjectId,
      ipAddress,
    });
  }
}
