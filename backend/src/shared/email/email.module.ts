import { Global, Module } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email-provider.interface';
import { SmtpEmailProvider } from './providers/smtp-email.provider';
import { EmailTemplateService } from './email-template.service';
import { EmailBrandService } from './brand/email-brand.service';

/**
 * EmailModule — global module providing email delivery, templating, and
 * brand resolution via NestJS DI.
 *
 * Exports:
 *  - EMAIL_PROVIDER     (IEmailProvider)     — low-level send()
 *  - EmailTemplateService                    — high-level sendWelcome/sendVerification/…
 *  - EmailBrandService                       — resolves tenant-aware BaseTemplateData
 *
 * Marked @Global so every feature module gets all three without explicit import.
 */
@Global()
@Module({
  providers: [
    { provide: EMAIL_PROVIDER, useClass: SmtpEmailProvider },
    EmailTemplateService,
    EmailBrandService,
  ],
  exports: [EMAIL_PROVIDER, EmailTemplateService, EmailBrandService],
})
export class EmailModule {}
