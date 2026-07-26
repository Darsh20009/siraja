import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getCardHtml, getCodeBoxHtml, getEmailIllustration, escapeHtml, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export interface OtpTemplateData extends BaseTemplateData {
  fullName: string;
  otpCode: string;
  expiresInMinutes?: number;
  purpose?: string;
}

export function otpEmailTemplate(data: OtpTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    fullName,
    otpCode,
    expiresInMinutes = 10,
    purpose          = 'تسجيل الدخول',
    tenantName       = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor     = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor      = SIRAJA_BRAND_DEFAULTS.accentColor,
  } = data;

  // ── HTML-safe aliases ──────────────────────────────────────────────────────
  const sFull    = escapeHtml(fullName);
  const sPurpose = escapeHtml(purpose);
  const sTenant  = escapeHtml(tenantName);

  const subject = `🔑 رمز التحقق الخاص بك — ${tenantName}`;

  const illustration = getEmailIllustration('otp', primaryColor, accentColor);

  const codeBox = getCodeBoxHtml(otpCode, primaryColor);

  const expiryCard = getCardHtml(
    `⏱ هذا الرمز صالح لمدة <strong>${expiresInMinutes} دقيقة</strong> فقط ولاستخدام واحد.`,
    'warning'
  );

  const securityCard = getCardHtml(
    `🔒 <strong>تنبيه أمني:</strong> لا تشارك هذا الرمز مع أحد. لن يطلب منك فريق ${sTenant} هذا الرمز أبداً عبر الهاتف أو البريد الإلكتروني.`,
    'danger'
  );

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:23px;font-weight:800;margin:0 0 8px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      رمز التحقق الخاص بك
    </h2>
    <div class="heading-rule" style="width:52px;height:3px;background:linear-gradient(to left,transparent,${accentColor},${primaryColor});
                border-radius:99px;margin:0 0 24px;"></div>

    <p style="margin:0 0 8px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مرحباً <strong style="color:${SIRAJA_COLORS.textPrimary};">${sFull}</strong>،
    </p>
    <p style="margin:0 0 20px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      استخدم الرمز أدناه لإتمام عملية <strong style="color:${SIRAJA_COLORS.textPrimary};">${sPurpose}</strong>:
    </p>

    ${codeBox}

    ${expiryCard}
    ${securityCard}
  `;

  const text = `مرحباً ${fullName}،\n\nرمز التحقق الخاص بك هو: ${otpCode}\n\nصالح لـ ${expiresInMinutes} دقيقة فقط.\n\nلا تشارك هذا الرمز مع أحد.\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
