import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Role } from '@shared/enums/roles.enum';
import { UserStatus } from '@shared/enums/user-status.enum';
import { AuthProvider } from '@shared/enums/auth-provider.enum';
import { AuditAction } from '@shared/enums/audit.enum';
import {
  IUserAuthRepository,
  USER_AUTH_REPOSITORY,
} from '../../domain/repositories/user-auth.repository.interface';
import { AuthAuditService } from '../../infrastructure/services/audit.service';
import { IssueSessionHelper, DeviceContext } from './issue-session.helper';
import { AuthResult } from '../dto/auth-result';

export interface VerifiedOAuthProfile {
  provider: AuthProvider.GOOGLE | AuthProvider.APPLE;
  providerUserId: string;
  email?: string;
  fullName?: string;
  emailVerified?: boolean;
}

/**
 * Shared OAuth login/link/register logic for both Google and Apple —
 * the provider-specific strategies (`google.strategy.ts` /
 * `apple.strategy.ts`) only verify the token and hand back a normalized
 * `VerifiedOAuthProfile`; everything after that (find-or-link-or-create,
 * session issuance) is identical between providers, so it lives here
 * once instead of being duplicated per provider.
 *
 * Resolution order:
 *   1. Already linked (`linkedProviders` match) → log straight in.
 *   2. Not linked, but an account with the same, provider-verified email
 *      already exists → auto-link (safe because the provider itself
 *      vouches the email is verified — this is the standard "sign in
 *      with Google/Apple links to existing email account" behavior).
 *   3. Neither → provision a brand-new account, pre-verified (the OAuth
 *      provider already proved control of the email; no separate email
 *      verification token is needed).
 */
@Injectable()
export class OAuthLoginUseCase {
  constructor(
    @Inject(USER_AUTH_REPOSITORY) private readonly users: IUserAuthRepository,
    private readonly audit: AuthAuditService,
    private readonly issueSession: IssueSessionHelper,
  ) {}

  async execute(
    tenantId: Types.ObjectId | string,
    profile: VerifiedOAuthProfile,
    ctx: DeviceContext,
  ): Promise<AuthResult> {
    let user = await this.users.findByLinkedProvider(tenantId, profile.provider, profile.providerUserId);

    if (!user && profile.email) {
      const existingByEmail = await this.users.findByEmail(tenantId, profile.email);
      if (existingByEmail) {
        user = await this.users.updateById(existingByEmail._id as Types.ObjectId, {
          linkedProviders: [
            ...(existingByEmail.linkedProviders ?? []),
            { provider: profile.provider, providerUserId: profile.providerUserId, linkedAt: new Date() },
          ],
        });
        await this.audit.record({
          tenantId,
          actor: existingByEmail._id as Types.ObjectId,
          action: AuditAction.OAUTH_LINKED,
          entityId: existingByEmail._id as Types.ObjectId,
          changes: { provider: profile.provider },
          ipAddress: ctx.ipAddress,
        });
      }
    }

    if (!user) {
      if (!profile.email) {
        throw new UnauthorizedException(`${profile.provider} did not provide an email to register with.`);
      }
      user = await this.users.create({
        tenantId: tenantId as Types.ObjectId,
        email: profile.email.toLowerCase(),
        fullName: profile.fullName || profile.email.split('@')[0],
        roles: [Role.STUDENT],
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isPhoneVerified: false,
        linkedProviders: [{ provider: profile.provider, providerUserId: profile.providerUserId, linkedAt: new Date() }],
      });
      await this.audit.record({
        tenantId,
        actor: user._id as Types.ObjectId,
        action: AuditAction.REGISTER,
        entityId: user._id as Types.ObjectId,
        changes: { provider: profile.provider },
        ipAddress: ctx.ipAddress,
      });
    }

    await this.users.updateById(user._id as Types.ObjectId, {
      lastLoginAt: new Date(),
      lastLoginIp: ctx.ipAddress,
    });

    await this.audit.record({
      tenantId,
      actor: user._id as Types.ObjectId,
      action: AuditAction.LOGIN,
      entityId: user._id as Types.ObjectId,
      changes: { provider: profile.provider },
      ipAddress: ctx.ipAddress,
    });

    return this.issueSession.issue(user, ctx);
  }
}
