import { Inject, Injectable, Logger } from '@nestjs/common';
import { EMAIL_PROVIDER, IEmailProvider } from '@shared/email/email-provider.interface';

/**
 * Email delivery seam for auth flows (verification, password reset,
 * suspicious login) — every such flow is Email-only per Phase 4's "no SMS
 * OTP" instruction, so this service is on the critical path for both.
 *
 * Delegates to the shared `IEmailProvider` (SMTP via Nodemailer by
 * default, see `shared/email/`) so delivery actually happens once
 * `EMAIL_HOST`/`EMAIL_USER`/`EMAIL_PASS` are configured. If those env
 * vars are unset, `SmtpEmailProvider` itself no-ops with a warning log
 * (see `smtp-email.provider.ts`) rather than throwing — so the rest of
 * the auth flow (token generation, hashing, expiry, single-use
 * consumption) keeps working in dev/CI without a mail provider.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: IEmailProvider,
  ) {}

  async sendVerificationEmail(email: string, rawToken: string, appUrl: string): Promise<void> {
    const link = `${appUrl}/auth/verify-email?token=${rawToken}`;
    await this.emailProvider.send({
      to: email,
      subject: 'Verify your Siraja account',
      text: `Welcome to Siraja!\n\nTo verify your account, open the link below:\n${link}\n\nIf you did not create this account, you can safely ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Welcome to Siraja!</h2>
          <p>To verify your account, click the button below:</p>
          <p style="margin: 24px 0;">
            <a href="${link}" style="background:#0f766e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Verify account</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color:#555;">${link}</p>
          <p>If you did not create this account, you can safely ignore this email.</p>
        </div>
      `,
    });
    this.logger.log(`Verification email dispatched to ${email}`);
  }

  async sendPasswordResetEmail(email: string, rawToken: string, appUrl: string): Promise<void> {
    const link = `${appUrl}/auth/reset-password?token=${rawToken}`;
    await this.emailProvider.send({
      to: email,
      subject: 'Reset your Siraja password',
      text: `We received a request to reset your Siraja account password.\n\nTo reset it, open the link below (valid for a limited time):\n${link}\n\nIf you did not request this, you can safely ignore this email — nothing will change.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Reset your password</h2>
          <p>We received a request to reset the password for your Siraja account.</p>
          <p style="margin: 24px 0;">
            <a href="${link}" style="background:#0f766e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset password</a>
          </p>
          <p>This link is valid for a limited time only.</p>
          <p>If you did not request this, you can safely ignore this email — nothing will change on your account.</p>
        </div>
      `,
    });
    this.logger.log(`Password reset email dispatched to ${email}`);
  }

  async sendSuspiciousLoginAlert(email: string, ipAddress: string, userAgent?: string): Promise<void> {
    const device = userAgent ?? 'an unknown device';
    await this.emailProvider.send({
      to: email,
      subject: 'Unusual sign-in detected — Siraja',
      text: `We noticed a sign-in to your account from an unusual location or device.\n\nIP address: ${ipAddress}\nDevice: ${device}\n\nIf this was you, you can ignore this email. If it wasn't, we recommend changing your password immediately and reviewing the devices linked to your account.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Unusual sign-in detected</h2>
          <p>We noticed a sign-in to your account from an unusual location or device:</p>
          <ul>
            <li><strong>IP address:</strong> ${ipAddress}</li>
            <li><strong>Device:</strong> ${device}</li>
          </ul>
          <p>If this was you, you can ignore this email.</p>
          <p>If it wasn't, we recommend changing your password immediately and reviewing the devices linked to your account.</p>
        </div>
      `,
    });
    this.logger.warn(`Suspicious login alert dispatched to ${email} from ${ipAddress} (${device})`);
  }
}
