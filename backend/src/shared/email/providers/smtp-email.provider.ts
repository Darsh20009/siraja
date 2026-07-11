import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEmailProvider, SendEmailOptions } from '../email-provider.interface';

/**
 * SMTP-based email provider backed by Nodemailer.
 *
 * Configured entirely from environment variables (EMAIL_HOST, EMAIL_PORT,
 * EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, EMAIL_FROM, EMAIL_FROM_NAME).
 * Point these at any SMTP relay (SendGrid, SES, Mailgun, Postmark, your own
 * SMTP server) — no code changes required.
 *
 * If EMAIL_HOST is not configured the provider logs a warning and skips
 * sending rather than throwing, so the app starts cleanly in environments
 * where email is not yet set up (dev, CI).
 */
@Injectable()
export class SmtpEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('email.host', '');
    const port = this.configService.get<number>('email.port', 587);
    const secure = this.configService.get<boolean>('email.secure', false);
    const user = this.configService.get<string>('email.user', '');
    const pass = this.configService.get<string>('email.pass', '');
    const from = this.configService.get<string>('email.from', 'noreply@siraja.com');
    const fromName = this.configService.get<string>('email.fromName', 'Siraja');

    this.fromAddress = `"${fromName}" <${from}>`;

    if (!host) {
      this.logger.warn(
        'EMAIL_HOST is not set — email delivery is disabled. ' +
          'Configure EMAIL_HOST (and EMAIL_USER/EMAIL_PASS) to enable it.',
      );
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async send(options: SendEmailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Email skipped (no SMTP host configured): "${options.subject}" → ${options.to}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: options.from ?? this.fromAddress,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        replyTo: options.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`Email sent: "${options.subject}" → ${options.to}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Email delivery failed: ${message}`, { subject: options.subject, to: options.to });
      throw err;
    }
  }
}
