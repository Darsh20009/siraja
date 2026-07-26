import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getCardHtml, getCodeBoxHtml, getEmailIllustration, escapeHtml, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

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
  const {
    fullName,
    verificationUrl,
    verificationCode,
    expiresInHours   = 24,
    tenantName        = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor      = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor       = SIRAJA_BRAND_DEFAULTS.accentColor,
    supportEmail      = SIRAJA_BRAND_DEFAULTS.supportEmail,
  } = data;

  // ── HTML-safe aliases ──────────────────────────────────────────────────────
  const sFull   = escapeHtml(fullName);
  const sTenant = escapeHtml(tenantName);

  const subject = `✉️ تأكيد بريدك الإلكتروني — ${tenantName}`;

  const illustration = getEmailIllustration('verification', primaryColor, accentColor);

  const ctaButton = getButtonHtml({
    href:  verificationUrl,
    label: '✅ تأكيد البريد الإلكتروني',
    primaryColor,
    accentColor,
    width: 270,
  });

  const codeBox = verificationCode
    ? `<p style="margin:16px 0 4px;color:${SIRAJA_COLORS.textSecondary};font-size:14px;
                font-family:'Cairo',Tahoma,Arial,sans-serif;text-align:center;">
         أو أدخل رمز التحقق يدوياً:
       </p>
       ${getCodeBoxHtml(verificationCode, primaryColor)}`
    : '';

  const expiryCard = getCardHtml(
    `⏱ ينتهي هذا الرابط خلال <strong>${expiresInHours} ساعة</strong>. إذا لم تطلب هذا التأكيد يمكنك تجاهل هذا البريد بأمان.`,
    'warning'
  );

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:23px;font-weight:800;margin:0 0 8px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      تحقق من بريدك الإلكتروني
    </h2>
    <div class="heading-rule" style="width:52px;height:3px;background:linear-gradient(to left,transparent,${accentColor},${primaryColor});
                border-radius:99px;margin:0 0 24px;"></div>

    <p style="margin:0 0 16px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مرحباً <strong style="color:${SIRAJA_COLORS.textPrimary};">${sFull}</strong>،
      خطوة واحدة تفصلك عن الانضمام إلى <strong style="color:${SIRAJA_COLORS.textPrimary};">${sTenant}</strong>.
      اضغط الزر أدناه لتأكيد بريدك وتفعيل حسابك.
    </p>

    ${ctaButton}
    ${codeBox}

    <p class="link-fallback"
       style="text-align:center;font-size:12px;color:${SIRAJA_COLORS.textMuted};
              margin:-8px 0 24px;word-break:break-all;direction:ltr;
              font-family:Tahoma,Arial,sans-serif;">
      لا يعمل الزر؟ انسخ هذا الرابط:
      <a href="${verificationUrl}" style="color:${primaryColor};text-decoration:underline;">${verificationUrl}</a>
    </p>

    ${expiryCard}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:26px 0 18px;"/>

    <p style="font-size:13px;color:${SIRAJA_COLORS.textMuted};margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1.8;">
      تحتاج إلى مساعدة؟ تواصل معنا على
      <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;font-weight:600;">${supportEmail}</a>
    </p>
  `;

  const text = `مرحباً ${fullName}،\n\nأكّد بريدك الإلكتروني عبر:\n${verificationUrl}${verificationCode ? `\n\nأو الرمز: ${verificationCode}` : ''}\n\nينتهي الرابط خلال ${expiresInHours} ساعة.\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
