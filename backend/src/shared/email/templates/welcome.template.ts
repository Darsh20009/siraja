import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export interface WelcomeTemplateData extends BaseTemplateData {
  fullName: string;
  loginUrl: string;
  role?: string;
}

export function welcomeEmailTemplate(data: WelcomeTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    fullName,
    loginUrl,
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
  } = data;

  const subject = `🌟 مرحباً بك في ${tenantName} — حسابك جاهز!`;

  const illustration = getEmailIllustration('welcome', primaryColor, accentColor);

  const ctaButton = getButtonHtml({
    href:         loginUrl,
    label:        '🚀 ابدأ رحلتك مع القرآن',
    primaryColor,
    accentColor,
    width:        260,
  });

  const headingRule = `<div style="width:48px;height:3px;background:${accentColor};background:linear-gradient(to left,transparent,${accentColor},${primaryColor});border-radius:2px;margin:0 0 22px;"></div>`;

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:22px;font-weight:700;margin:0 0 6px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      أهلاً وسهلاً، ${fullName}! 🌙
    </h2>
    ${headingRule}

    <p style="margin:0 0 16px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      يسعدنا انضمامك إلى <strong style="color:${SIRAJA_COLORS.textPrimary};">${tenantName}</strong> —
      منصتك الذكية لحفظ القرآن الكريم وتتبع تقدمك مع شيخك وحلقتك.
    </p>

    <p style="margin:0 0 12px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      حسابك جاهز الآن ويمكنك البدء فوراً:
    </p>

    <ul class="feature-list" style="list-style:none;padding:0;margin:0 0 20px;">
      <li style="padding:10px 4px;border-bottom:1px solid ${SIRAJA_COLORS.borderLight};font-size:14px;color:${SIRAJA_COLORS.textSecondary};font-family:'Cairo',Tahoma,Arial,sans-serif;">
        📖&nbsp;&nbsp;تتبع حفظك وتسميعك يومياً
      </li>
      <li style="padding:10px 4px;border-bottom:1px solid ${SIRAJA_COLORS.borderLight};font-size:14px;color:${SIRAJA_COLORS.textSecondary};font-family:'Cairo',Tahoma,Arial,sans-serif;">
        🧑‍🏫&nbsp;&nbsp;التواصل مع شيخك ومتابعة تقييماتك
      </li>
      <li style="padding:10px 4px;border-bottom:1px solid ${SIRAJA_COLORS.borderLight};font-size:14px;color:${SIRAJA_COLORS.textSecondary};font-family:'Cairo',Tahoma,Arial,sans-serif;">
        📊&nbsp;&nbsp;تحليل ذكي لأخطائك وتقدمك
      </li>
      <li style="padding:10px 4px;border-bottom:1px solid ${SIRAJA_COLORS.borderLight};font-size:14px;color:${SIRAJA_COLORS.textSecondary};font-family:'Cairo',Tahoma,Arial,sans-serif;">
        🏆&nbsp;&nbsp;مشاركة في لوحات الشرف
      </li>
      <li style="padding:10px 4px;font-size:14px;color:${SIRAJA_COLORS.textSecondary};font-family:'Cairo',Tahoma,Arial,sans-serif;">
        🤖&nbsp;&nbsp;مساعد ذكاء اصطناعي لدعم رحلة الحفظ
      </li>
    </ul>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr><td align="center" style="padding:24px 0 0;">${ctaButton}</td></tr>
    </table>

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:30px 0 22px;"/>

    <p style="font-size:14px;color:${SIRAJA_COLORS.textMuted};text-align:center;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      بارك الله فيك ووفقك لما يحبه ويرضاه 🤲
    </p>
  `;

  const text = `أهلاً وسهلاً، ${fullName}!\n\nمرحباً بك في منصة ${tenantName}.\n\nابدأ رحلتك عبر: ${loginUrl}\n\nبارك الله فيك.\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
