import { Inject, Injectable, Logger } from '@nestjs/common';
import { IEmailProvider, EMAIL_PROVIDER } from './email-provider.interface';

import { welcomeEmailTemplate,          WelcomeTemplateData          } from './templates/welcome.template';
import { verificationEmailTemplate,     VerificationTemplateData     } from './templates/verification.template';
import { passwordResetEmailTemplate,    PasswordResetTemplateData    } from './templates/password-reset.template';
import { notificationEmailTemplate,     NotificationTemplateData     } from './templates/notification.template';
import { systemAlertEmailTemplate,      SystemAlertTemplateData      } from './templates/system-alert.template';
import { otpEmailTemplate,              OtpTemplateData              } from './templates/otp.template';
import { invitationEmailTemplate,       InvitationTemplateData       } from './templates/invitation.template';
import { weeklySummaryEmailTemplate,    WeeklySummaryTemplateData    } from './templates/weekly-summary.template';
import { monthlyReportEmailTemplate,    MonthlyReportTemplateData    } from './templates/monthly-report.template';
import { securityAlertEmailTemplate,    SecurityAlertTemplateData    } from './templates/security-alert.template';
import { achievementEmailTemplate,      AchievementTemplateData      } from './templates/achievement.template';
import { gamificationRewardEmailTemplate, GamificationRewardTemplateData } from './templates/gamification-reward.template';

// Re-export DTOs so callers can import from a single location
export type {
  WelcomeTemplateData,
  VerificationTemplateData,
  PasswordResetTemplateData,
  NotificationTemplateData,
  SystemAlertTemplateData,
  OtpTemplateData,
  InvitationTemplateData,
  WeeklySummaryTemplateData,
  MonthlyReportTemplateData,
  SecurityAlertTemplateData,
  AchievementTemplateData,
  GamificationRewardTemplateData,
};

/**
 * EmailTemplateService — high-level email sending with branded HTML templates.
 *
 * Wraps the low-level IEmailProvider and adds:
 *   - Template selection and rendering (12 templates)
 *   - Consistent logging (recipient, template type)
 *   - Plain-text fallback alongside HTML
 *   - Non-fatal error handling — email failures never crash the caller flow
 *
 * Callers inject this service; they never touch IEmailProvider or templates directly.
 * Brand data (colors, logo URL, tenant name) comes from EmailBrandService.resolve().
 */
@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(@Inject(EMAIL_PROVIDER) private readonly emailProvider: IEmailProvider) {}

  // ── Original 6 templates (API unchanged) ────────────────────────────────────

  async sendWelcome(to: string, data: WelcomeTemplateData): Promise<void> {
    const { subject, html, text } = welcomeEmailTemplate(data);
    await this.send('welcome', to, subject, html, text);
  }

  async sendVerification(to: string, data: VerificationTemplateData): Promise<void> {
    const { subject, html, text } = verificationEmailTemplate(data);
    await this.send('verification', to, subject, html, text);
  }

  async sendOtp(to: string, data: OtpTemplateData): Promise<void> {
    const { subject, html, text } = otpEmailTemplate(data);
    await this.send('otp', to, subject, html, text);
  }

  async sendPasswordReset(to: string, data: PasswordResetTemplateData): Promise<void> {
    const { subject, html, text } = passwordResetEmailTemplate(data);
    await this.send('password-reset', to, subject, html, text);
  }

  async sendNotification(to: string, data: NotificationTemplateData): Promise<void> {
    const { subject, html, text } = notificationEmailTemplate(data);
    await this.send('notification', to, subject, html, text);
  }

  async sendSystemAlert(to: string, data: SystemAlertTemplateData): Promise<void> {
    const { subject, html, text } = systemAlertEmailTemplate(data);
    await this.send('system-alert', to, subject, html, text);
  }

  // ── New 6 templates ──────────────────────────────────────────────────────────

  async sendInvitation(to: string, data: InvitationTemplateData): Promise<void> {
    const { subject, html, text } = invitationEmailTemplate(data);
    await this.send('invitation', to, subject, html, text);
  }

  async sendWeeklySummary(to: string, data: WeeklySummaryTemplateData): Promise<void> {
    const { subject, html, text } = weeklySummaryEmailTemplate(data);
    await this.send('weekly-summary', to, subject, html, text);
  }

  async sendMonthlyReport(to: string, data: MonthlyReportTemplateData): Promise<void> {
    const { subject, html, text } = monthlyReportEmailTemplate(data);
    await this.send('monthly-report', to, subject, html, text);
  }

  async sendSecurityAlert(to: string, data: SecurityAlertTemplateData): Promise<void> {
    const { subject, html, text } = securityAlertEmailTemplate(data);
    await this.send('security-alert', to, subject, html, text);
  }

  async sendAchievement(to: string, data: AchievementTemplateData): Promise<void> {
    const { subject, html, text } = achievementEmailTemplate(data);
    await this.send('achievement', to, subject, html, text);
  }

  async sendGamificationReward(to: string, data: GamificationRewardTemplateData): Promise<void> {
    const { subject, html, text } = gamificationRewardEmailTemplate(data);
    await this.send('gamification-reward', to, subject, html, text);
  }

  // ── Internal dispatcher ──────────────────────────────────────────────────────

  private async send(
    templateType: string,
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    try {
      await this.emailProvider.send({ to, subject, html, text });
      this.logger.log(`[${templateType}] sent → ${to}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[${templateType}] failed → ${to}: ${message}`);
      // Non-fatal — email failures never crash the caller flow.
    }
  }
}
