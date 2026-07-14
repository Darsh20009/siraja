import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_EMAIL, JOB_EMAIL_WELCOME, JOB_EMAIL_VERIFICATION, JOB_EMAIL_PASSWORD_RESET, JOB_EMAIL_NOTIFICATION, JOB_EMAIL_SYSTEM_ALERT } from '../queue.constants';
import { EmailTemplateService } from '@shared/email/email-template.service';
import type { WelcomeEmailJob, VerificationEmailJob, PasswordResetEmailJob, NotificationEmailJob, SystemAlertEmailJob } from '../jobs/email.jobs';

@Processor(QUEUE_EMAIL)
export class EmailQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(private readonly emailTemplateService: EmailTemplateService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing job ${job.name} [${job.id}]`);

    switch (job.name) {
      case JOB_EMAIL_WELCOME:
        return this.handleWelcome(job.data as WelcomeEmailJob);
      case JOB_EMAIL_VERIFICATION:
        return this.handleVerification(job.data as VerificationEmailJob);
      case JOB_EMAIL_PASSWORD_RESET:
        return this.handlePasswordReset(job.data as PasswordResetEmailJob);
      case JOB_EMAIL_NOTIFICATION:
        return this.handleNotification(job.data as NotificationEmailJob);
      case JOB_EMAIL_SYSTEM_ALERT:
        return this.handleSystemAlert(job.data as SystemAlertEmailJob);
      default:
        this.logger.warn(`Unknown email job: ${job.name}`);
    }
  }

  private async handleWelcome(data: WelcomeEmailJob): Promise<void> {
    await this.emailTemplateService.sendWelcome(data.to, {
      fullName: data.fullName,
      loginUrl: data.loginUrl,
      tenantName: data.tenantName,
    });
  }

  private async handleVerification(data: VerificationEmailJob): Promise<void> {
    await this.emailTemplateService.sendVerification(data.to, {
      fullName: data.fullName,
      verificationUrl: data.verificationUrl,
      tenantName: data.tenantName,
    });
  }

  private async handlePasswordReset(data: PasswordResetEmailJob): Promise<void> {
    await this.emailTemplateService.sendPasswordReset(data.to, {
      fullName: data.fullName,
      resetUrl: data.resetUrl,
      expiresInMinutes: data.expiresInMinutes,
      tenantName: data.tenantName,
    });
  }

  private async handleNotification(data: NotificationEmailJob): Promise<void> {
    await this.emailTemplateService.sendNotification(data.to, {
      tenantName: data.tenantName,
      title: data.title,
      message: data.body,
      recipientName: data.to, // fallback — callers should pass recipientName in body
      actionUrl: data.actionUrl,
      actionLabel: data.actionLabel,
    });
  }

  private async handleSystemAlert(data: SystemAlertEmailJob): Promise<void> {
    const recipients = Array.isArray(data.to) ? data.to : [data.to];
    await Promise.all(
      recipients.map((email) =>
        this.emailTemplateService.sendSystemAlert(email, {
          severity: data.severity,
          title: data.title,
          message: data.message,
          details: data.details,
          timestamp: data.timestamp,
        }),
      ),
    );
  }
}
