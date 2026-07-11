import { Global, Module } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email-provider.interface';
import { SmtpEmailProvider } from './providers/smtp-email.provider';

/**
 * EmailModule — global module providing IEmailProvider via DI.
 *
 * Marked @Global so every feature module can inject EMAIL_PROVIDER without
 * importing EmailModule explicitly. Swap the SmtpEmailProvider for a
 * different concrete class here (e.g. SendGridEmailProvider) to change
 * the delivery backend without touching any call site.
 */
@Global()
@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useClass: SmtpEmailProvider,
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
