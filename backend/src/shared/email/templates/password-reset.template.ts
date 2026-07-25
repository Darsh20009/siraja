import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getCardHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

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
  const {
    fullName,
    resetUrl,
    expiresInMinutes = 30,
    requestIp,
    tenantName       = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor     = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor      = SIRAJA_BRAND_DEFAULTS.accentColor,
    supportEmail     = SIRAJA_BRAND_DEFAULTS.supportEmail,
  } = data;

  const subject = `🔐 إعادة تعيين كلمة المرور — ${tenantName}`;

  const illustration = getEmailIllustration('password-reset', primaryColor, accentColor);

  const ctaButton = getButtonHtml({
    href:  resetUrl,
    label: '🔐 إعادة تعيين كلمة المرور',
    primaryColor,
    accentColor,
    width: 270,
  });

  const expiryCard = getCardHtml(
    `⏱ هذا الرابط صالح لمدة <strong>${expiresInMinutes} دقيقة</strong> فقط ولاستخدام واحد. بعد انتهاء المهلة ستحتاج إلى طلب رابط جديد.`,
    'warning'
  );

  const ipCard = requestIp
    ? getCardHtml(
        `🌐 <strong>معلومة أمنية:</strong> طُلب هذا الإجراء من عنوان IP: <strong style="direction:ltr;display:inline-block;">${requestIp}</strong>. إذا لم تكن أنت من طلب ذلك، فأمّن حسابك فوراً.`,
        'danger'
      )
    : '';

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:23px;font-weight:800;margin:0 0 8px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      إعادة تعيين كلمة المرور
    </h2>
    <div style="width:52px;height:3px;background:linear-gradient(to left,transparent,${accentColor},${primaryColor});
                border-radius:99px;margin:0 0 24px;"></div>

    <p style="margin:0 0 8px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مرحباً <strong style="color:${SIRAJA_COLORS.textPrimary};">${fullName}</strong>،
    </p>
    <p style="margin:0 0 24px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في <strong style="color:${SIRAJA_COLORS.textPrimary};">${tenantName}</strong>.
      اضغط الزر أدناه لاختيار كلمة مرور جديدة:
    </p>

    ${ctaButton}

    <p class="link-fallback"
       style="text-align:center;font-size:12px;color:${SIRAJA_COLORS.textMuted};
              margin:-8px 0 24px;word-break:break-all;direction:ltr;
              font-family:Tahoma,Arial,sans-serif;">
      لا يعمل الزر؟ انسخ الرابط:
      <a href="${resetUrl}" style="color:${primaryColor};text-decoration:underline;">${resetUrl}</a>
    </p>

    ${expiryCard}
    ${ipCard}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:26px 0 18px;"/>

    <p style="font-size:13px;color:${SIRAJA_COLORS.textMuted};margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1.8;">
      لم تطلب هذا؟ يمكنك تجاهل هذا البريد بأمان. إذا احتجت مساعدة تواصل معنا على
      <a href="mailto:${supportEmail}" style="color:${primaryColor};font-weight:600;text-decoration:none;">${supportEmail}</a>
    </p>
  `;

  const text = `مرحباً ${fullName}،\n\nأعد تعيين كلمة مرورك عبر:\n${resetUrl}\n\nصالح لـ ${expiresInMinutes} دقيقة.\n\nلم تطلب ذلك؟ تجاهل هذا البريد.\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
