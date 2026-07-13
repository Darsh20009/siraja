import { Global, Module } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email-provider.interface';
import { SmtpEmailProvider } from './providers/smtp-email.provider';
import { EmailTemplateService } from './email-template.service';

/**
 * EmailModule — global module providing email delivery and templating via DI.
 *
 * Exports:
 *  - EMAIL_PROVIDER (IEmailProvider) — low-level send()
 *  - EmailTemplateService            — high-level sendWelcome/sendVerification/etc.
 *
 * Marked @Global so every feature module gets both without explicit import.
 */
@Global()
@Module({
  providers: [
    { provide: EMAIL_PROVIDER, useClass: SmtpEmailProvider },
    EmailTemplateService,
  ],
  exports: [EMAIL_PROVIDER, EmailTemplateService],
})
export class EmailModule {}
