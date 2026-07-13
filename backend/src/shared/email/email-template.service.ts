import { Inject, Injectable, Logger } from '@nestjs/common';
import { IEmailProvider, EMAIL_PROVIDER } from './email-provider.interface';
import { welcomeEmailTemplate, WelcomeTemplateData } from './templates/welcome.template';
import { verificationEmailTemplate, VerificationTemplateData } from './templates/verification.template';
import { passwordResetEmailTemplate, PasswordResetTemplateData } from './templates/password-reset.template';
import { notificationEmailTemplate, NotificationTemplateData } from './templates/notification.template';

/**
 * EmailTemplateService — high-level email sending with branded HTML templates.
 *
 * This service wraps the low-level IEmailProvider and adds:
 * - Template selection and rendering
 * - Consistent logging (recipient, template type, tenant)
 * - Plain-text fallback alongside HTML
 *
 * Callers inject this service; they never touch IEmailProvider or templates directly.
 */
@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(@Inject(EMAIL_PROVIDER) private readonly emailProvider: IEmailProvider) {}

  async sendWelcome(to: string, data: WelcomeTemplateData): Promise<void> {
    const { subject, html, text } = welcomeEmailTemplate(data);
    await this.send('welcome', to, subject, html, text);
  }

  async sendVerification(to: string, data: VerificationTemplateData): Promise<void> {
    const { subject, html, text } = verificationEmailTemplate(data);
    await this.send('verification', to, subject, html, text);
  }

  async sendPasswordReset(to: string, data: PasswordResetTemplateData): Promise<void> {
    const { subject, html, text } = passwordResetEmailTemplate(data);
    await this.send('password-reset', to, subject, html, text);
  }

  async sendNotification(to: string, data: NotificationTemplateData): Promise<void> {
    const { subject, html, text } = notificationEmailTemplate(data);
    await this.send('notification', to, subject, html, text);
  }

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
      // Do not rethrow — email failures are non-fatal; caller flow continues.
    }
  }
}
