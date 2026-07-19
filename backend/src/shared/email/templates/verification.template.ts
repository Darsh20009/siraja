import { baseEmailTemplate, BaseTemplateData } from './base.template';

export interface VerificationTemplateData extends BaseTemplateData {
  fullName: string;
  verificationUrl: string;
  verificationCode?: string;
  expiresInHours?: number;
}

export function verificationEmailTemplate(data: VerificationTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const { fullName, verificationUrl, verificationCode, expiresInHours = 24, tenantName = 'سراج' } = data;

  const subject = `✉️ تأكيد بريدك الإلكتروني — ${tenantName}`;

  const codeSection = verificationCode
    ? `<div class="code-box">${verificationCode}</div>
       <p style="text-align:center;font-size:12px;color:#999;margin-top:-8px;">أدخل هذا الرمز في التطبيق</p>`
    : '';

  const body = `
    <h2>🌟 أهلاً وسهلاً، ${fullName}!</h2>

    <p>
      شكراً لانضمامك إلى <strong>${tenantName}</strong>، رفيقك في رحلة حفظ كتاب الله الكريم.
      خطوة واحدة تفصلك عن بدء رحلتك — قم بتأكيد بريدك الإلكتروني:
    </p>

    ${codeSection}

    <div class="btn-wrap">
      <a href="${verificationUrl}" class="btn">✔ تأكيد البريد الإلكتروني</a>
    </div>

    <p class="link-fallback">
      أو انسخ هذا الرابط في متصفحك:<br/>
      <a href="${verificationUrl}">${verificationUrl}</a>
    </p>

    <div class="info-card">
      ⏱ &nbsp;هذا الرابط صالح لمدة <strong>${expiresInHours} ساعة</strong> من وقت إرساله.
    </div>

    <hr class="section-divider"/>

    <p style="font-size:13px;color:#888;">
      إذا لم تقم بإنشاء حساب في منصة سراج، يمكنك تجاهل هذه الرسالة بأمان —
      لن يحدث أي تغيير في حسابك.
    </p>

    <p style="font-size:13px;color:#888;">
      للمساعدة تواصل معنا على
      <a href="mailto:support@siraja.website" style="color:#1A6B4A;">support@siraja.website</a>
    </p>
  `;

  const text = `أهلاً ${fullName}،\n\nشكراً لانضمامك إلى منصة سراج.\n\nيرجى تأكيد بريدك الإلكتروني عبر الرابط:\n${verificationUrl}\n\nصالح لمدة ${expiresInHours} ساعة.\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
