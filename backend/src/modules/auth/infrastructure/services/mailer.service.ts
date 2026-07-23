import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER, IEmailProvider } from '@shared/email/email-provider.interface';
import { verificationEmailTemplate } from '@shared/email/templates/verification.template';
import { passwordResetEmailTemplate } from '@shared/email/templates/password-reset.template';
import { notificationEmailTemplate } from '@shared/email/templates/notification.template';

interface BrandData {
  tenantName: string;
  primaryColor: string;
  accentColor: string;
  supportEmail: string;
  websiteUrl: string;
}

/**
 * Email delivery seam for auth flows (verification, password reset,
 * suspicious login) — every email is rendered through the shared branded
 * HTML template system (base.template.ts) so all outbound mail carries
 * the Siraja identity consistently.
 *
 * Delegates to the shared IEmailProvider (SMTP via Nodemailer).
 * If EMAIL_HOST is unset, SmtpEmailProvider no-ops with a WARN — the auth
 * flow continues (token generation, hashing, expiry) without crashing.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: IEmailProvider,
    private readonly config: ConfigService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Public methods
  // ─────────────────────────────────────────────────────────────────────────

  async sendVerificationEmail(email: string, rawToken: string, appUrl: string): Promise<void> {
    const verificationUrl = `${appUrl}/auth/verify-email?token=${rawToken}`;
    const { subject, html, text } = verificationEmailTemplate({
      ...this.getBrand(),
      fullName: email.split('@')[0],   // best-effort name until we pass it through
      verificationUrl,
      expiresInHours: 24,
    });

    await this.deliver('verification', email, subject, html, text);
  }

  async sendPasswordResetEmail(email: string, rawToken: string, appUrl: string): Promise<void> {
    const resetUrl = `${appUrl}/auth/reset-password?token=${rawToken}`;
    const { subject, html, text } = passwordResetEmailTemplate({
      ...this.getBrand(),
      fullName: email.split('@')[0],
      resetUrl,
      expiresInMinutes: 60,
    });

    await this.deliver('password-reset', email, subject, html, text);
  }

  async sendSuspiciousLoginAlert(email: string, ipAddress: string, userAgent?: string): Promise<void> {
    const device = userAgent ?? 'جهاز غير معروف';
    const { subject, html, text } = notificationEmailTemplate({
      ...this.getBrand(),
      recipientName: email.split('@')[0],
      type: 'warning',
      title: 'تسجيل دخول غير مألوف',
      message: `
        لاحظنا تسجيل دخول إلى حسابك من موقع أو جهاز غير مألوف:<br/><br/>
        <strong>عنوان IP:</strong> ${ipAddress}<br/>
        <strong>الجهاز:</strong> ${device}<br/><br/>
        إذا كنت أنت، يمكنك تجاهل هذه الرسالة.
        إذا لم تكن أنت، <strong>غيّر كلمة مرورك فوراً</strong> وراجع الأجهزة المرتبطة بحسابك.
      `,
    });

    await this.deliver('suspicious-login', email, subject, html, text);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** Reads brand values from config so they reflect env-var overrides. */
  private getBrand(): BrandData {
    return {
      tenantName:   'سراج',
      primaryColor: '#1A6B4A',
      accentColor:  '#C9A84C',
      supportEmail: this.config.get<string>('email.supportEmail', 'support@siraja.website'),
      websiteUrl:   this.config.get<string>('appUrl', 'https://siraja.website'),
    };
  }

  private async deliver(
    type: string,
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    try {
      await this.emailProvider.send({ to, subject, html, text });
      this.logger.log(`[${type}] dispatched → ${to}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[${type}] failed → ${to}: ${msg}`);
      // Non-fatal — auth flow continues even if email delivery fails.
    }
  }
}
