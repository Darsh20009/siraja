import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getCardHtml, getCodeBoxHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export interface VerificationTemplateData extends BaseTemplateData {
  fullName: string;
  verificationUrl: string;
  /** Optional OTP code displayed alongside the link */
  verificationCode?: string;
  /** Link validity in hours (default: 24) */
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
    expiresInHours = 24,
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
    supportEmail = SIRAJA_BRAND_DEFAULTS.supportEmail,
  } = data;

  const subject = `✉️ تأكيد بريدك الإلكتروني — ${tenantName}`;

  const illustration = getEmailIllustration('verification', primaryColor, accentColor);

  const codeSection = verificationCode
    ? getCodeBoxHtml(verificationCode, primaryColor) +
      `<p style="text-align:center;font-size:12.5px;color:${SIRAJA_COLORS.textMuted};margin:-8px 0 20px;
                 font-family:'Cairo',Tahoma,Arial,sans-serif;">أدخل هذا الرمز في التطبيق</p>`
    : '';

  const ctaButton = getButtonHtml({
    href:         verificationUrl,
    label:        '✔ تأكيد البريد الإلكتروني',
    primaryColor,
    accentColor,
    width:        260,
  });

  const expiryCard = getCardHtml(
    `⏱&nbsp; هذا الرابط صالح لمدة <strong>${expiresInHours} ساعة</strong> من وقت إرساله.`,
    'info',
  );

  const headingRule = `<div style="width:48px;height:3px;background:${accentColor};background:linear-gradient(to left,transparent,${accentColor},${primaryColor});border-radius:2px;margin:0 0 22px;"></div>`;

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:22px;font-weight:700;margin:0 0 6px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      🌟 أهلاً وسهلاً، ${fullName}!
    </h2>
    ${headingRule}

    <p style="margin:0 0 16px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      شكراً لانضمامك إلى <strong style="color:${SIRAJA_COLORS.textPrimary};">${tenantName}</strong>،
      رفيقك في رحلة حفظ كتاب الله الكريم. خطوة واحدة تفصلك عن بدء رحلتك —
      قم بتأكيد بريدك الإلكتروني:
    </p>

    ${codeSection}

    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr><td align="center" style="padding:24px 0 0;">${ctaButton}</td></tr>
    </table>

    <p style="text-align:center;font-size:12px;color:${SIRAJA_COLORS.textMuted};margin:8px 0 20px;
              word-break:break-all;direction:ltr;font-family:Tahoma,Arial,sans-serif;">
      <a href="${verificationUrl}" style="color:${primaryColor};">${verificationUrl}</a>
    </p>

    ${expiryCard}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:26px 0;"/>

    <p style="font-size:13px;color:${SIRAJA_COLORS.textMuted};margin:0 0 10px;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      إذا لم تقم بإنشاء حساب في منصة ${tenantName}، يمكنك تجاهل هذه الرسالة بأمان.
    </p>

    <p style="font-size:13px;color:${SIRAJA_COLORS.textMuted};margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      للمساعدة تواصل معنا على
      <a href="mailto:${supportEmail}" style="color:${primaryColor};">${supportEmail}</a>
    </p>
  `;

  const text = `أهلاً ${fullName}،\n\nشكراً لانضمامك إلى منصة ${tenantName}.\n\nيرجى تأكيد بريدك الإلكتروني عبر الرابط:\n${verificationUrl}\n\nصالح لمدة ${expiresInHours} ساعة.\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
