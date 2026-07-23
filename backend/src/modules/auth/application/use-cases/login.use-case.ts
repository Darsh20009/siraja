import { ForbiddenException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuditAction } from '@shared/enums/audit.enum';
import { UserStatus } from '@shared/enums/user-status.enum';
import {
  IUserAuthRepository,
  USER_AUTH_REPOSITORY,
} from '../../domain/repositories/user-auth.repository.interface';
import {
  ILoginAttemptRepository,
  LOGIN_ATTEMPT_REPOSITORY,
} from '../../domain/repositories/login-attempt.repository.interface';
import { PasswordService } from '../../infrastructure/services/password.service';
import { AuthAuditService } from '../../infrastructure/services/audit.service';
import { MailerService } from '../../infrastructure/services/mailer.service';
import { BruteForceGuardService } from '../../infrastructure/services/brute-force-guard.service';
import { IssueSessionHelper, DeviceContext } from './issue-session.helper';
import { LoginDto } from '../dto/login.dto';
import { AuthResult } from '../dto/auth-result';

const SUSPICIOUS_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * Login flow (see docs/architecture/10-authentication-blueprint.md
 * §Login Flow): identifier resolution → lockout check → rate-limit check
 * → password verify → suspicious-login check → issue session. Every
 * branch — including failures — writes a `LoginAttempt` row, since that
 * collection is the sole source of truth `BruteForceGuardService` and
 * the suspicious-login check both read from.
 */
@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    @Inject(USER_AUTH_REPOSITORY) private readonly users: IUserAuthRepository,
    @Inject(LOGIN_ATTEMPT_REPOSITORY) private readonly loginAttempts: ILoginAttemptRepository,
    private readonly passwordService: PasswordService,
    private readonly audit: AuthAuditService,
    private readonly mailer: MailerService,
    private readonly bruteForceGuard: BruteForceGuardService,
    private readonly issueSession: IssueSessionHelper,
  ) {}

  async execute(tenantId: Types.ObjectId | string, dto: LoginDto, ctx: DeviceContext): Promise<AuthResult> {
    await this.assertNotIpRateLimited(tenantId, ctx.ipAddress);

    const identifier = dto.identifier.trim().toLowerCase();
    const user = identifier.includes('@')
      ? await this.users.findByEmail(tenantId, identifier)
      : await this.users.findByPhone(tenantId, identifier);

    if (!user) {
      await this.recordFailure(tenantId, identifier, undefined, ctx, 'invalid_credentials');
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await this.recordFailure(tenantId, identifier, user._id as Types.ObjectId, ctx, 'account_locked');
      throw new ForbiddenException('Account temporarily locked due to too many failed attempts. Try again later.');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
      await this.recordFailure(tenantId, identifier, user._id as Types.ObjectId, ctx, 'account_suspended');
      throw new ForbiddenException('This account is not active.');
    }

    const passwordOk = user.passwordHash && (await this.passwordService.verify(user.passwordHash, dto.password));
    if (!passwordOk) {
      await this.handleFailedPassword(tenantId, identifier, user, ctx);
      throw new UnauthorizedException('Invalid credentials.');
    }

    const wasKnownDevice = await this.loginAttempts.hasRecentSuccessFrom(
      user._id as Types.ObjectId,
      ctx.ipAddress,
      ctx.userAgent,
      SUSPICIOUS_LOOKBACK_MS,
    );

    await this.loginAttempts.record({
      tenantId,
      identifier,
      userId: user._id as Types.ObjectId,
      success: true,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    await this.users.updateById(user._id as Types.ObjectId, {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ctx.ipAddress,
    });

    await this.audit.record({
      tenantId,
      actor: user._id as Types.ObjectId,
      action: AuditAction.LOGIN,
      entityId: user._id as Types.ObjectId,
      ipAddress: ctx.ipAddress,
    });

    if (!wasKnownDevice && user.email) {
      await this.audit.record({
        tenantId,
        actor: user._id as Types.ObjectId,
        action: AuditAction.SUSPICIOUS_LOGIN,
        entityId: user._id as Types.ObjectId,
        ipAddress: ctx.ipAddress,
        changes: { userAgent: ctx.userAgent },
      });
      try {
        await this.mailer.sendSuspiciousLoginAlert(user.email, ctx.ipAddress, ctx.userAgent);
      } catch (emailErr: unknown) {
        // Non-fatal — suspicious login is already audit-logged above; email
        // delivery failure must not block the login response.
        const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
        this.logger.warn(`Suspicious-login alert email failed for ${user.email}: ${msg}`);
      }
    }

    return this.issueSession.issue(user, ctx);
  }

  private async assertNotIpRateLimited(tenantId: Types.ObjectId | string, ipAddress: string) {
    try {
      await this.bruteForceGuard.assertNotRateLimited(tenantId, ipAddress);
    } catch (e) {
      throw new ForbiddenException((e as Error).message);
    }
  }

  private async handleFailedPassword(tenantId: Types.ObjectId | string, identifier: string, user: any, ctx: DeviceContext) {
    await this.recordFailure(tenantId, identifier, user._id, ctx, 'invalid_credentials');
    const lockUntil = await this.bruteForceGuard.computeLockout(tenantId, identifier);
    const update: Record<string, unknown> = { failedLoginCount: (user.failedLoginCount ?? 0) + 1 };
    if (lockUntil) {
      update.lockedUntil = lockUntil;
      await this.audit.record({
        tenantId,
        actor: user._id,
        action: AuditAction.ACCOUNT_LOCKED,
        entityId: user._id,
        ipAddress: ctx.ipAddress,
      });
    }
    await this.users.updateById(user._id, update);
  }

  private async recordFailure(
    tenantId: Types.ObjectId | string,
    identifier: string,
    userId: Types.ObjectId | undefined,
    ctx: DeviceContext,
    reason: string,
  ) {
    await this.loginAttempts.record({
      tenantId,
      identifier,
      userId,
      success: false,
      failureReason: reason,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    if (userId) {
      await this.audit.record({
        tenantId,
        actor: userId,
        action: AuditAction.LOGIN_FAILED,
        entityId: userId,
        ipAddress: ctx.ipAddress,
        changes: { reason },
      });
    }
  }
}
