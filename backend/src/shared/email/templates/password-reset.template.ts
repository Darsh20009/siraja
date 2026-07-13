import { baseEmailTemplate, BaseTemplateData } from './base.template';

export interface PasswordResetTemplateData extends BaseTemplateData {
  fullName: string;
  resetUrl: string;
  expiresInMinutes?: number;
  requestIp?: string;
}

export function passwordResetEmailTemplate(data: PasswordResetTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const { fullName, resetUrl, expiresInMinutes = 60, requestIp, tenantName = 'Siraja' } = data;

  const subject = `إعادة تعيين كلمة المرور — ${tenantName}`;

  const ipNote = requestIp
    ? `<p style="color: #888; font-size: 12px;">تم طلب إعادة التعيين من العنوان: ${requestIp}</p>`
    : '';

  const body = `
    <h2>إعادة تعيين كلمة المرور</h2>
    <p>مرحباً <strong>${fullName}</strong>،</p>
    <p>
      تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في <strong>${tenantName}</strong>.
      اضغط على الزر أدناه لإنشاء كلمة مرور جديدة:
    </p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" class="btn">إعادة تعيين كلمة المرور</a>
    </p>
    <p style="color: #888; font-size: 13px;">
      ⏱ هذا الرابط صالح لمدة ${expiresInMinutes} دقيقة.
    </p>
    ${ipNote}
    <p style="color: #888; font-size: 13px;">
      إذا لم تطلب إعادة تعيين كلمة المرور، فتجاهل هذه الرسالة — حسابك بأمان.
    </p>
  `;

  const text = `مرحباً ${fullName}،\n\nاضغط على الرابط لإعادة تعيين كلمة المرور:\n${resetUrl}\n\nصالح لمدة ${expiresInMinutes} دقيقة.\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
