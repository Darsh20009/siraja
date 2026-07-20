import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getCodeBoxHtml, getCardHtml, SIRAJA_BRAND_DEFAULTS } from '../brand/brand-config';

export interface OtpTemplateData extends BaseTemplateData {
  /** Recipient's display name */
  fullName: string;
  /** The OTP code to display (typically 4-8 digits) */
  otpCode: string;
  /** How many minutes the OTP is valid for (default: 10) */
  expiresInMinutes?: number;
  /**
   * Context for the OTP — tells the user what they're confirming.
   * e.g. 'تأكيد بريدك الإلكتروني' | 'تسجيل الدخول' | 'تغيير كلمة المرور'
   * Defaults to generic 'تأكيد الهوية'
   */
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
    purpose = 'تأكيد الهوية',
    tenantName = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
  } = data;

  const subject = `🔑 رمز التحقق الخاص بك — ${tenantName}`;

  const codeBox    = getCodeBoxHtml(otpCode, primaryColor);
  const expiryCard = getCardHtml(
    `⏱&nbsp; هذا الرمز صالح لمدة <strong>${expiresInMinutes} دقيقة</strong> فقط من لحظة إرساله.`,
    'info',
  );
  const securityCard = getCardHtml(
    `🔒&nbsp; <strong>لا تشارك هذا الرمز مع أحد.</strong> لن يطلب منك فريق ${tenantName} هذا الرمز أبداً.`,
    'warning',
  );

  const body = `
    <h2 style="color:${primaryColor};font-size:21px;font-weight:700;margin:0 0 20px;
               padding-bottom:10px;border-bottom:2px solid #EEF0EC;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      🔑 رمز التحقق الخاص بك
    </h2>

    <p style="margin:0 0 16px;color:#4B5563;font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مرحباً <strong style="color:#1F2937;">${fullName}</strong>،
    </p>

    <p style="margin:0 0 8px;color:#4B5563;font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      استخدم رمز التحقق أدناه لإتمام عملية <strong style="color:#1F2937;">${purpose}</strong>:
    </p>

    ${codeBox}

    <p style="text-align:center;font-size:12.5px;color:#9CA3AF;margin:-8px 0 20px;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      أدخل هذا الرمز في التطبيق للمتابعة
    </p>

    ${expiryCard}
    ${securityCard}

    <hr style="border:none;border-top:1px solid #EEF0EC;margin:24px 0;"/>

    <p style="font-size:13px;color:#9CA3AF;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة بأمان — لن يحدث أي تغيير في حسابك.
    </p>
  `;

  const text = `رمز التحقق الخاص بك — ${tenantName}\n\nمرحباً ${fullName}،\n\nرمز التحقق الخاص بك هو:\n\n${otpCode}\n\nصالح لمدة ${expiresInMinutes} دقيقة.\n\nلا تشارك هذا الرمز مع أحد.\n\nإذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
