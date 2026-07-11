/**
 * IEmailProvider — provider-agnostic email delivery contract.
 *
 * Concrete implementations (SMTP via Nodemailer, SendGrid, SES, Mailgun …)
 * implement this interface. The calling code never knows which transport
 * is active — switch providers by swapping the registered class in
 * EmailModule, not by changing call sites.
 */
export interface SendEmailOptions {
  /** Recipient address(es). */
  to: string | string[];
  /** Subject line. */
  subject: string;
  /** Plain-text body (always provide alongside html for clients that strip HTML). */
  text: string;
  /** Optional HTML body. */
  html?: string;
  /** Override the configured From address/name for this message. */
  from?: string;
  /** Reply-To address. */
  replyTo?: string;
}

export interface IEmailProvider {
  send(options: SendEmailOptions): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
