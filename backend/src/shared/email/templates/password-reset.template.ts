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
  const { fullName, resetUrl, expiresInMinutes = 60, requestIp, tenantName = 'سراج' } = data;

  const subject = `🔐 إعادة تعيين كلمة المرور — ${tenantName}`;

  const ipNote = requestIp
    ? `<div class="warn-card">⚠️ &nbsp;هذا الطلب صدر من العنوان: <strong>${requestIp}</strong><br/>إذا لم تكن أنت، غيّر كلمة مرورك فوراً.</div>`
    : '';

  const body = `
    <h2>🔐 إعادة تعيين كلمة المرور</h2>

    <p>مرحباً <strong>${fullName}</strong>،</p>

    <p>
      تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في <strong>${tenantName}</strong>.
      اضغط على الزر أدناه لإنشاء كلمة مرور جديدة:
    </p>

    <div class="btn-wrap">
      <a href="${resetUrl}" class="btn">🔑 إعادة تعيين كلمة المرور</a>
    </div>

    <p class="link-fallback">
      أو انسخ هذا الرابط في متصفحك:<br/>
      <a href="${resetUrl}">${resetUrl}</a>
    </p>

    <div class="info-card">
      ⏱ &nbsp;هذا الرابط صالح لمدة <strong>${expiresInMinutes} دقيقة</strong> فقط.
      لا تشاركه مع أحد.
    </div>

    ${ipNote}

    <hr class="section-divider"/>

    <p style="font-size:13px;color:#888;">
      إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان —
      لن يحدث أي تغيير في حسابك.
    </p>

    <p style="font-size:13px;color:#888;">
      للمساعدة تواصل معنا على
      <a href="mailto:support@siraja.website" style="color:#1A6B4A;">support@siraja.website</a>
    </p>
  `;

  const text = `مرحباً ${fullName}،\n\nاضغط على الرابط لإعادة تعيين كلمة مرورك:\n${resetUrl}\n\nصالح لمدة ${expiresInMinutes} دقيقة.\n\nإذا لم تطلب ذلك، تجاهل هذه الرسالة.\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
