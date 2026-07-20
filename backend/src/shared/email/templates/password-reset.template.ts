import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getCardHtml, SIRAJA_BRAND_DEFAULTS } from '../brand/brand-config';

export interface PasswordResetTemplateData extends BaseTemplateData {
  fullName: string;
  resetUrl: string;
  /** Validity in minutes (default: 60) */
  expiresInMinutes?: number;
  /** IP address of the reset request — shown in a warn card if provided */
  requestIp?: string;
}

export function passwordResetEmailTemplate(data: PasswordResetTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    fullName,
    resetUrl,
    expiresInMinutes = 60,
    requestIp,
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
    supportEmail = SIRAJA_BRAND_DEFAULTS.supportEmail,
  } = data;

  const subject = `🔐 إعادة تعيين كلمة المرور — ${tenantName}`;

  const ctaButton = getButtonHtml({
    href:         resetUrl,
    label:        '🔑 إعادة تعيين كلمة المرور',
    primaryColor,
    accentColor,
    width:        260,
  });

  const expiryCard = getCardHtml(
    `⏱&nbsp; هذا الرابط صالح لمدة <strong>${expiresInMinutes} دقيقة</strong> فقط. لا تشاركه مع أحد.`,
    'info',
  );

  const ipCard = requestIp
    ? getCardHtml(
        `⚠️&nbsp; هذا الطلب صدر من العنوان: <strong>${requestIp}</strong><br/>إذا لم تكن أنت من طلب ذلك، <strong>غيّر كلمة مرورك فوراً</strong>.`,
        'warning',
      )
    : '';

  const body = `
    <h2 style="color:${primaryColor};font-size:21px;font-weight:700;margin:0 0 20px;
               padding-bottom:10px;border-bottom:2px solid #EEF0EC;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      🔐 إعادة تعيين كلمة المرور
    </h2>

    <p style="margin:0 0 8px;color:#4B5563;font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مرحباً <strong style="color:#1F2937;">${fullName}</strong>،
    </p>

    <p style="margin:0 0 16px;color:#4B5563;font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في <strong style="color:#1F2937;">${tenantName}</strong>.
      اضغط على الزر أدناه لإنشاء كلمة مرور جديدة:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr><td align="center" style="padding:20px 0 0;">${ctaButton}</td></tr>
    </table>

    <p style="text-align:center;font-size:12px;color:#9CA3AF;margin:8px 0 20px;
              word-break:break-all;direction:ltr;font-family:Tahoma,Arial,sans-serif;">
      <a href="${resetUrl}" style="color:${primaryColor};">${resetUrl}</a>
    </p>

    ${expiryCard}
    ${ipCard}

    <hr style="border:none;border-top:1px solid #EEF0EC;margin:24px 0;"/>

    <p style="font-size:13px;color:#9CA3AF;margin:0 0 10px;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان —
      لن يحدث أي تغيير في حسابك.
    </p>

    <p style="font-size:13px;color:#9CA3AF;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      للمساعدة تواصل معنا على
      <a href="mailto:${supportEmail}" style="color:${primaryColor};">${supportEmail}</a>
    </p>
  `;

  const text = `مرحباً ${fullName}،\n\nاضغط على الرابط لإعادة تعيين كلمة مرورك:\n${resetUrl}\n\nصالح لمدة ${expiresInMinutes} دقيقة.\n\nإذا لم تطلب ذلك، تجاهل هذه الرسالة.\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
