import { baseEmailTemplate, BaseTemplateData } from './base.template';

export interface VerificationTemplateData extends BaseTemplateData {
  fullName: string;
  verificationUrl: string;
  /** Raw OTP token (6-char) when using code-based verification instead of URL */
  verificationCode?: string;
  expiresInHours?: number;
}

export function verificationEmailTemplate(data: VerificationTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const { fullName, verificationUrl, verificationCode, expiresInHours = 24, tenantName = 'Siraja' } = data;

  const subject = `تحقق من بريدك الإلكتروني — ${tenantName}`;

  const codeSection = verificationCode
    ? `<div class="code-box">${verificationCode}</div>`
    : '';

  const body = `
    <h2>تأكيد البريد الإلكتروني</h2>
    <p>مرحباً <strong>${fullName}</strong>،</p>
    <p>
      شكراً لتسجيلك في <strong>${tenantName}</strong>. يرجى تأكيد عنوان بريدك الإلكتروني للوصول الكامل إلى حسابك.
    </p>
    ${codeSection}
    <p style="text-align: center; margin: 28px 0;">
      <a href="${verificationUrl}" class="btn">تأكيد البريد الإلكتروني</a>
    </p>
    <p style="color: #888; font-size: 13px;">
      ⏱ هذا الرابط صالح لمدة ${expiresInHours} ساعة. إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة.
    </p>
  `;

  const text = `مرحباً ${fullName}،\n\nيرجى تأكيد بريدك الإلكتروني عبر الرابط:\n${verificationUrl}\n\nصالح لمدة ${expiresInHours} ساعة.\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
