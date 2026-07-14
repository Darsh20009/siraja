/**
 * Phase 12A — Email Templates Unit Tests
 *
 * Tests: baseEmailTemplate, welcomeEmailTemplate, verificationEmailTemplate,
 *        passwordResetEmailTemplate, notificationEmailTemplate,
 *        EmailTemplateService (error-swallowing behaviour)
 *
 * Strategy: pure unit tests — no external I/O required.
 */

import { Logger } from '@nestjs/common';
import { baseEmailTemplate } from './templates/base.template';
import { welcomeEmailTemplate } from './templates/welcome.template';
import { verificationEmailTemplate } from './templates/verification.template';
import { passwordResetEmailTemplate } from './templates/password-reset.template';
import { notificationEmailTemplate } from './templates/notification.template';
import { EmailTemplateService } from './email-template.service';

// ─── Silence logger during tests ─────────────────────────────────────────────

beforeAll(() => jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

// ─── baseEmailTemplate ────────────────────────────────────────────────────────
// signature: baseEmailTemplate(body: string, data?: BaseTemplateData): string

describe('baseEmailTemplate', () => {
  const body = '<p>Test content here</p>';
  const data = { tenantName: 'Tuwaiq Academy', logoUrl: 'https://cdn.example.com/logo.png', primaryColor: '#1A73E8' };

  it('returns an HTML string', () => {
    const html = baseEmailTemplate(body, data);
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(50);
  });

  it('injects the tenant name into the output', () => {
    const html = baseEmailTemplate(body, data);
    expect(html).toContain('Tuwaiq Academy');
  });

  it('injects the body content into the output', () => {
    const html = baseEmailTemplate(body, data);
    expect(html).toContain('Test content here');
  });

  it('injects the logo URL when provided', () => {
    const html = baseEmailTemplate(body, data);
    expect(html).toContain('https://cdn.example.com/logo.png');
  });

  it('applies the primary color', () => {
    const html = baseEmailTemplate(body, data);
    expect(html).toContain('#1A73E8');
  });

  it('includes dir="rtl" for Arabic-first layout', () => {
    const html = baseEmailTemplate(body, data);
    expect(html).toContain('rtl');
  });

  it('uses default tenantName "Siraja" when omitted', () => {
    const html = baseEmailTemplate(body);
    expect(html).toContain('Siraja');
  });

  it('renders valid DOCTYPE HTML', () => {
    const html = baseEmailTemplate(body, data);
    expect(html.trim()).toMatch(/^<!DOCTYPE html>/i);
  });
});

// ─── welcomeEmailTemplate ─────────────────────────────────────────────────────
// data: { fullName, loginUrl, tenantName? }

describe('welcomeEmailTemplate', () => {
  const data = {
    fullName: 'Ahmed Al-Rashid',
    loginUrl: 'https://furqan.siraja.app/login',
    tenantName: 'Furqan Institute',
    primaryColor: '#2E7D32',
  };

  it('returns subject, html, and text', () => {
    const result = welcomeEmailTemplate(data);
    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('html');
    expect(result).toHaveProperty('text');
  });

  it('includes the recipient full name in the HTML', () => {
    const { html } = welcomeEmailTemplate(data);
    expect(html).toContain('Ahmed Al-Rashid');
  });

  it('includes the login URL in the HTML', () => {
    const { html } = welcomeEmailTemplate(data);
    expect(html).toContain('https://furqan.siraja.app/login');
  });

  it('includes the tenant name in the subject', () => {
    const { subject } = welcomeEmailTemplate(data);
    expect(subject).toContain('Furqan Institute');
  });

  it('includes the tenant name in the HTML', () => {
    const { html } = welcomeEmailTemplate(data);
    expect(html).toContain('Furqan Institute');
  });

  it('produces a non-empty plain-text version', () => {
    const { text } = welcomeEmailTemplate(data);
    expect(text.length).toBeGreaterThan(10);
  });

  it('includes the login URL in the plain text', () => {
    const { text } = welcomeEmailTemplate(data);
    expect(text).toContain('https://furqan.siraja.app/login');
  });
});

// ─── verificationEmailTemplate ────────────────────────────────────────────────
// data: { fullName, verificationUrl, expiresInHours? }

describe('verificationEmailTemplate', () => {
  const data = {
    fullName: 'Fatima Said',
    verificationUrl: 'https://tuwaiq.siraja.app/verify?token=abc123',
    tenantName: 'Tuwaiq Academy',
    expiresInHours: 24,
  };

  it('includes the verification URL in HTML', () => {
    const { html } = verificationEmailTemplate(data);
    expect(html).toContain('https://tuwaiq.siraja.app/verify?token=abc123');
  });

  it('includes the expiry duration in HTML', () => {
    const { html } = verificationEmailTemplate(data);
    expect(html).toContain('24');
  });

  it('includes the recipient name in HTML', () => {
    const { html } = verificationEmailTemplate(data);
    expect(html).toContain('Fatima Said');
  });

  it('includes the verification URL in plain text', () => {
    const { text } = verificationEmailTemplate(data);
    expect(text).toContain('https://tuwaiq.siraja.app/verify?token=abc123');
  });

  it('includes the tenant name in the subject', () => {
    const { subject } = verificationEmailTemplate(data);
    expect(subject).toContain('Tuwaiq Academy');
  });

  it('shows a verification code block when verificationCode is provided', () => {
    const { html } = verificationEmailTemplate({ ...data, verificationCode: 'AB12CD' });
    expect(html).toContain('AB12CD');
  });

  it('defaults expiresInHours to 24 when omitted', () => {
    const { html } = verificationEmailTemplate({ fullName: 'X', verificationUrl: 'https://x.com', tenantName: 'T' });
    expect(html).toContain('24');
  });
});

// ─── passwordResetEmailTemplate ───────────────────────────────────────────────
// data: { fullName, resetUrl, expiresInMinutes? }

describe('passwordResetEmailTemplate', () => {
  const data = {
    fullName: 'Omar Khalid',
    resetUrl: 'https://tuwaiq.siraja.app/reset?token=xyz789',
    tenantName: 'Tuwaiq Academy',
    expiresInMinutes: 60,
  };

  it('includes the password reset URL in HTML', () => {
    const { html } = passwordResetEmailTemplate(data);
    expect(html).toContain('https://tuwaiq.siraja.app/reset?token=xyz789');
  });

  it('includes the expiry time (in minutes) in HTML', () => {
    const { html } = passwordResetEmailTemplate(data);
    expect(html).toContain('60');
  });

  it('includes the recipient name in HTML', () => {
    const { html } = passwordResetEmailTemplate(data);
    expect(html).toContain('Omar Khalid');
  });

  it('includes the reset URL in plain text', () => {
    const { text } = passwordResetEmailTemplate(data);
    expect(text).toContain('https://tuwaiq.siraja.app/reset?token=xyz789');
  });

  it('includes the tenant name in the subject', () => {
    const { subject } = passwordResetEmailTemplate(data);
    expect(subject).toContain('Tuwaiq Academy');
  });

  it('shows the request IP when provided', () => {
    const { html } = passwordResetEmailTemplate({ ...data, requestIp: '192.168.1.1' });
    expect(html).toContain('192.168.1.1');
  });

  it('does not include IP note when requestIp is omitted', () => {
    const { html } = passwordResetEmailTemplate(data);
    expect(html).not.toContain('192.168.1.1');
  });

  it('defaults expiresInMinutes to 60 when omitted', () => {
    const { html } = passwordResetEmailTemplate({ fullName: 'X', resetUrl: 'https://x.com', tenantName: 'T' });
    expect(html).toContain('60');
  });
});

// ─── notificationEmailTemplate ────────────────────────────────────────────────
// data: { recipientName, title, message, actionUrl?, actionLabel? }

describe('notificationEmailTemplate', () => {
  const data = {
    recipientName: 'Sara Nasser',
    title: 'New Attendance Record',
    message: 'You have been marked absent for session on 2025-06-10.',
    tenantName: 'Tuwaiq Academy',
    actionUrl: 'https://tuwaiq.siraja.app/attendance/123',
    actionLabel: 'View Details',
  };

  it('includes the notification title in HTML', () => {
    const { html } = notificationEmailTemplate(data);
    expect(html).toContain('New Attendance Record');
  });

  it('includes the notification message in HTML', () => {
    const { html } = notificationEmailTemplate(data);
    expect(html).toContain('marked absent');
  });

  it('includes the action URL when provided', () => {
    const { html } = notificationEmailTemplate(data);
    expect(html).toContain('https://tuwaiq.siraja.app/attendance/123');
  });

  it('includes the action label when provided', () => {
    const { html } = notificationEmailTemplate(data);
    expect(html).toContain('View Details');
  });

  it('includes the recipient name in HTML', () => {
    const { html } = notificationEmailTemplate(data);
    expect(html).toContain('Sara Nasser');
  });

  it('renders cleanly without actionUrl (optional field)', () => {
    const { html } = notificationEmailTemplate({ ...data, actionUrl: undefined, actionLabel: undefined });
    expect(html).toContain('New Attendance Record');
    // No broken href when actionUrl is absent
    expect(html).not.toContain('href="undefined"');
  });

  it('uses title in the subject line', () => {
    const { subject } = notificationEmailTemplate(data);
    expect(subject).toContain('New Attendance Record');
  });

  it('includes the tenant name in the subject', () => {
    const { subject } = notificationEmailTemplate(data);
    expect(subject).toContain('Tuwaiq Academy');
  });
});

// ─── EmailTemplateService ─────────────────────────────────────────────────────
// Constructor: constructor(@Inject(EMAIL_PROVIDER) emailProvider: IEmailProvider)
// Methods: sendWelcome(to, data), sendVerification(to, data), etc.
// Provider method: emailProvider.send({ to, subject, html, text })

describe('EmailTemplateService', () => {
  function makeProvider(shouldFail = false) {
    return {
      send: jest.fn().mockImplementation(() => {
        if (shouldFail) throw new Error('SMTP connection refused');
        return Promise.resolve();
      }),
    };
  }

  const welcomeData = { fullName: 'Ahmed', tenantName: 'Tuwaiq', loginUrl: 'https://app.example.com/login' };
  const verifyData  = { fullName: 'Fatima', tenantName: 'Tuwaiq', verificationUrl: 'https://x.com/v?t=abc', expiresInHours: 24 };
  const resetData   = { fullName: 'Omar', tenantName: 'Tuwaiq', resetUrl: 'https://x.com/r?t=xyz', expiresInMinutes: 60 };
  const notifData   = { recipientName: 'Sara', tenantName: 'Tuwaiq', title: 'Absence Alert', message: 'Child was absent.' };

  it('calls provider.send when sending welcome email', async () => {
    const provider = makeProvider();
    const svc = new EmailTemplateService(provider as any);

    await svc.sendWelcome('student@example.com', welcomeData);

    expect(provider.send).toHaveBeenCalledTimes(1);
    const [args] = provider.send.mock.calls[0];
    expect(args.to).toBe('student@example.com');
    expect(args.html).toContain('Ahmed');
    expect(args.subject).toBeDefined();
  });

  it('calls provider.send when sending verification email', async () => {
    const provider = makeProvider();
    const svc = new EmailTemplateService(provider as any);

    await svc.sendVerification('new@example.com', verifyData);

    expect(provider.send).toHaveBeenCalledTimes(1);
    const [args] = provider.send.mock.calls[0];
    expect(args.to).toBe('new@example.com');
  });

  it('calls provider.send when sending password-reset email', async () => {
    const provider = makeProvider();
    const svc = new EmailTemplateService(provider as any);

    await svc.sendPasswordReset('user@example.com', resetData);

    expect(provider.send).toHaveBeenCalledTimes(1);
  });

  it('calls provider.send when sending notification email', async () => {
    const provider = makeProvider();
    const svc = new EmailTemplateService(provider as any);

    await svc.sendNotification('parent@example.com', notifData);

    expect(provider.send).toHaveBeenCalledTimes(1);
  });

  it('does NOT throw when the email provider fails (errors are swallowed)', async () => {
    const provider = makeProvider(true);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const svc = new EmailTemplateService(provider as any);

    await expect(svc.sendWelcome('x@y.com', welcomeData)).resolves.not.toThrow();
  });

  it('logs an error when provider.send fails', async () => {
    const provider = makeProvider(true);
    const errSpy   = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const svc      = new EmailTemplateService(provider as any);

    await svc.sendWelcome('x@y.com', welcomeData);

    expect(errSpy).toHaveBeenCalled();
    const logMsg = errSpy.mock.calls[0][0] as string;
    expect(logMsg).toContain('SMTP connection refused');
  });

  it('always sends both html and text in the payload', async () => {
    const provider = makeProvider();
    const svc = new EmailTemplateService(provider as any);

    await svc.sendWelcome('x@y.com', welcomeData);

    const [args] = provider.send.mock.calls[0];
    expect(args.html).toBeDefined();
    expect(args.text).toBeDefined();
    expect(args.text.length).toBeGreaterThan(5);
  });
});
