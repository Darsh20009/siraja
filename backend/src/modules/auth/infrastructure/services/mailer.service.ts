import { Injectable, Logger } from '@nestjs/common';

/**
 * Email delivery seam. No real provider (SES/SendGrid/Postmark/etc.) is
 * wired yet — every verification/reset flow is Email-only per Phase 4's
 * "no SMS OTP" instruction, so this service is on the critical path for
 * both. Logs in place of sending so the rest of the auth flow (token
 * generation, hashing, expiry, single-use consumption) is fully
 * implemented and testable without a mail provider dependency; swap the
 * body of these two methods for a real provider call when one is
 * connected, without touching any use case.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  async sendVerificationEmail(email: string, rawToken: string, appUrl: string): Promise<void> {
    const link = `${appUrl}/auth/verify-email?token=${rawToken}`;
    this.logger.log(`[stub] Verification email to ${email}: ${link}`);
  }

  async sendPasswordResetEmail(email: string, rawToken: string, appUrl: string): Promise<void> {
    const link = `${appUrl}/auth/reset-password?token=${rawToken}`;
    this.logger.log(`[stub] Password reset email to ${email}: ${link}`);
  }

  async sendSuspiciousLoginAlert(email: string, ipAddress: string, userAgent?: string): Promise<void> {
    this.logger.warn(`[stub] Suspicious login alert to ${email} from ${ipAddress} (${userAgent ?? 'unknown device'})`);
  }
}
