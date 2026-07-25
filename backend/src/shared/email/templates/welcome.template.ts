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
    width:        270,
  });

  const features = [
    { icon: '📖', text: 'تتبع حفظك وتسميعك يومياً مع شيخك' },
    { icon: '🧑‍🏫', text: 'التواصل مع شيخك ومتابعة تقييماتك' },
    { icon: '📊', text: 'تحليل ذكي لأخطائك وتقدمك في الحفظ' },
    { icon: '🏆', text: 'مشاركة في لوحات الشرف والإنجازات' },
    { icon: '🤖', text: 'مساعد ذكاء اصطناعي لدعم رحلة الحفظ' },
  ];

  const featureRows = features.map(f => `
    <tr>
      <td style="padding:11px 14px;border-bottom:1px solid ${SIRAJA_COLORS.borderLight};
                 font-size:14px;color:${SIRAJA_COLORS.textSecondary};
                 font-family:'Cairo',Tahoma,Arial,sans-serif;">
        <span style="margin-left:10px;font-size:18px;">${f.icon}</span>
        ${f.text}
      </td>
    </tr>`
  ).join('');

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:23px;font-weight:800;margin:0 0 8px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;letter-spacing:-0.2px;">
      أهلاً وسهلاً، ${fullName}! 🌙
    </h2>
    <div class="heading-rule" style="width:52px;height:3px;
         background:linear-gradient(to left,transparent,${accentColor},${primaryColor});
         border-radius:99px;margin:0 0 24px;"></div>

    <p style="margin:0 0 16px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      يسعدنا انضمامك إلى <strong style="color:${SIRAJA_COLORS.textPrimary};font-weight:700;">${tenantName}</strong> —
      منصتك الذكية لحفظ القرآن الكريم وتتبع تقدمك مع شيخك وحلقتك.
    </p>

    <p style="margin:0 0 16px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      حسابك جاهز الآن ويمكنك البدء فوراً بكل هذه المزايا:
    </p>

    <!-- Feature list -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
           style="background:${SIRAJA_COLORS.bgPage};border-radius:16px;overflow:hidden;
                  border:1px solid ${SIRAJA_COLORS.borderLight};margin:0 0 28px;">
      ${featureRows}
    </table>

    ${ctaButton}

    <p class="link-fallback"
       style="text-align:center;font-size:12px;color:${SIRAJA_COLORS.textMuted};
              margin:-8px 0 24px;word-break:break-all;direction:ltr;
              font-family:Tahoma,Arial,sans-serif;">
      أو انسخ هذا الرابط في متصفحك: <a href="${loginUrl}" style="color:${primaryColor};text-decoration:underline;">${loginUrl}</a>
    </p>

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:28px 0 22px;"/>

    <p style="font-size:14px;color:${SIRAJA_COLORS.textMuted};text-align:center;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1.8;">
      بارك الله فيك ووفقك لما يحبه ويرضاه 🤲<br/>
      <span style="font-size:13px;">فريق منصة ${tenantName}</span>
    </p>
  `;

  const text = `أهلاً وسهلاً، ${fullName}!\n\nمرحباً بك في منصة ${tenantName}.\n\nابدأ رحلتك عبر: ${loginUrl}\n\nبارك الله فيك.\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
