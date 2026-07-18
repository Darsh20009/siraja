import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { UserStatus } from '@shared/enums/user-status.enum';
import { Role } from '@shared/enums/roles.enum';
import { TokenPurpose } from '@shared/enums/token-purpose.enum';
import { AuditAction } from '@shared/enums/audit.enum';
import {
  IUserAuthRepository,
  USER_AUTH_REPOSITORY,
} from '../../domain/repositories/user-auth.repository.interface';
import {
  IVerificationTokenRepository,
  VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/verification-token.repository.interface';
import { PasswordService } from '../../infrastructure/services/password.service';
import { TokenService } from '../../infrastructure/services/token.service';
import { MailerService } from '../../infrastructure/services/mailer.service';
import { AuthAuditService } from '../../infrastructure/services/audit.service';
import { IssueSessionHelper, DeviceContext } from './issue-session.helper';
import { RegisterDto } from '../dto/register.dto';
import { AuthResult } from '../dto/auth-result';

/**
 * Registration flow (see docs/architecture/10-authentication-blueprint.md
 * §Registration Flow):
 *   1. Require email OR phone, reject neither.
 *   2. Reject duplicates within the tenant (email/phone are unique per
 *      tenant, not globally — see `User` schema doc).
 *   3. Hash the password (Argon2id) — never store plaintext even
 *      transiently in a log.
 *   4. Create the user as `PENDING_VERIFICATION` if an email was given
 *      (email verification required before full access), else `ACTIVE`
 *      (a phone-only identity has no verification channel in this
 *      phase's scope).
 *   5. If an email was given, issue an email-verification token and
 *      "send" it.
 *   6. Immediately issue a session (register-then-login UX) — the user
 *      does not have to log in separately right after registering, even
 *      though their email may still be unverified; unverified accounts
 *      are restricted at the authorization layer, not by refusing them a
 *      session at all.
 */
@Injectable()
export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    @Inject(USER_AUTH_REPOSITORY) private readonly users: IUserAuthRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly verificationTokens: IVerificationTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly mailer: MailerService,
    private readonly audit: AuthAuditService,
    private readonly issueSession: IssueSessionHelper,
    private readonly configService: ConfigService,
  ) {}

  async execute(tenantId: Types.ObjectId | string, dto: RegisterDto, ctx: DeviceContext): Promise<AuthResult> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone is required.');
    }

    if (dto.email) {
      const existing = await this.users.findByEmail(tenantId, dto.email);
      if (existing) throw new BadRequestException('An account with this email already exists.');
    }
    if (dto.phone) {
      const existing = await this.users.findByPhone(tenantId, dto.phone);
      if (existing) throw new BadRequestException('An account with this phone number already exists.');
    }

    this.passwordService.assertStrongEnough(dto.password);
    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.users.create({
      tenantId: tenantId as Types.ObjectId,
      email: dto.email?.toLowerCase(),
      phone: dto.phone,
      passwordHash,
      fullName: dto.fullName,
      roles: [dto.role ?? Role.STUDENT],
      status: dto.email ? UserStatus.PENDING_VERIFICATION : UserStatus.ACTIVE,
      isEmailVerified: false,
      isPhoneVerified: false,
    } as any);

    await this.audit.record({
      tenantId,
      actor: user._id as Types.ObjectId,
      action: AuditAction.REGISTER,
      entityId: user._id as Types.ObjectId,
      ipAddress: ctx.ipAddress,
    });

    if (dto.email) {
      // Email delivery is best-effort: the account is created and the session
      // is issued regardless of SMTP availability. If delivery fails (SMTP not
      // yet configured, transient relay error) we log a warning and continue —
      // the user can request a resend later. The verification token is already
      // persisted above so a successful resend will still work.
      try {
        await this.sendVerificationEmail(tenantId, user._id as Types.ObjectId, dto.email, ctx.ipAddress);
      } catch (emailErr: unknown) {
        const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
        this.logger.warn(`Verification email could not be sent to ${dto.email}: ${msg}`);
      }
    }

    return this.issueSession.issue(user, ctx);
  }

  private async sendVerificationEmail(
    tenantId: Types.ObjectId | string,
    userId: Types.ObjectId,
    email: string,
    ipAddress: string,
  ) {
    const { raw, hash } = this.tokenService.generateEmailToken();
    await this.verificationTokens.create({
      tenantId,
      userId,
      purpose: TokenPurpose.EMAIL_VERIFICATION,
      tokenHash: hash,
      email,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      requestIpAddress: ipAddress,
    });
    await this.mailer.sendVerificationEmail(email, raw, this.configService.get<string>('appUrl') || '');
  }
}
