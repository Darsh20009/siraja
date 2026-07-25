import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export type AchievementType =
  | 'juz'
  | 'surah'
  | 'milestone'
  | 'streak'
  | 'perfect'
  | 'general';

export interface AchievementTemplateData extends BaseTemplateData {
  studentName: string;
  achievementTitle: string;
  achievementDescription: string;
  achievementType?: AchievementType;
  /** Points awarded for this achievement */
  points?: number;
  /** Current level or rank of the student */
  level?: string;
  dashboardUrl: string;
  shareUrl?: string;
}

const ACHIEVEMENT_ICONS: Record<AchievementType, string> = {
  juz:       '📖',
  surah:     '🌿',
  milestone: '🎯',
  streak:    '🔥',
  perfect:   '💯',
  general:   '🏆',
};

export function achievementEmailTemplate(data: AchievementTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    studentName,
    achievementTitle,
    achievementDescription,
    achievementType = 'general',
    points,
    level,
    dashboardUrl,
    shareUrl,
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
  } = data;

  const icon    = ACHIEVEMENT_ICONS[achievementType] ?? '🏆';
  const subject = `${icon} إنجاز جديد! ${achievementTitle} — ${tenantName}`;

  const illustration = getEmailIllustration('achievement', primaryColor, accentColor);

  const ctaButton = getButtonHtml({
    href:  dashboardUrl,
    label: '🏆 عرض إنجازاتك',
    primaryColor,
    accentColor,
    width: 240,
  });

  const shareButton = shareUrl
    ? getButtonHtml({ href: shareUrl, label: '✨ مشاركة الإنجاز', primaryColor: accentColor, accentColor, width: 200 })
    : '';

  const headingRule = `<div style="width:48px;height:3px;background:${accentColor};background:linear-gradient(to left,transparent,${accentColor},${primaryColor});border-radius:2px;margin:0 0 22px;"></div>`;

  // Achievement card (premium gold-bordered card)
  const achievementCard = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       style="margin:20px 0;border-radius:12px;overflow:hidden;border:2px solid ${accentColor}38;">
  <tr>
    <td align="center" bgcolor="${SIRAJA_COLORS.bgPage}"
        style="background:${SIRAJA_COLORS.bgPage};padding:24px 20px;">
      <p style="margin:0 0 6px;font-size:36px;line-height:1;">${icon}</p>
      <p style="margin:0 0 8px;font-size:20px;font-weight:800;color:${accentColor};
                font-family:'Cairo',Tahoma,Arial,sans-serif;">${achievementTitle}</p>
      <p style="margin:0;font-size:14px;color:${SIRAJA_COLORS.textSecondary};
                font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1.7;">${achievementDescription}</p>
      ${points != null ? `<p style="margin:12px 0 0;font-size:13px;font-weight:700;color:${primaryColor};font-family:'Cairo',Tahoma,Arial,sans-serif;">+${points} نقطة</p>` : ''}
      ${level ? `<p style="margin:4px 0 0;font-size:12px;color:${SIRAJA_COLORS.textMuted};font-family:'Cairo',Tahoma,Arial,sans-serif;">المستوى: ${level}</p>` : ''}
    </td>
  </tr>
</table>`;

  const shareRow = shareUrl
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
         <tr><td align="center" style="padding:8px 0 0;">${shareButton}</td></tr>
       </table>`
    : '';

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:22px;font-weight:700;margin:0 0 6px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      ${icon} تهانينا على إنجازك الرائع!
    </h2>
    ${headingRule}

    <p style="margin:0 0 16px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      أحسنت يا <strong style="color:${SIRAJA_COLORS.textPrimary};">${studentName}</strong>!
      لقد حققت إنجازاً يستحق الاحتفال في رحلتك مع القرآن الكريم:
    </p>

    ${achievementCard}

    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr><td align="center" style="padding:20px 0 0;">${ctaButton}</td></tr>
    </table>

    ${shareRow}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:28px 0 22px;"/>

    <p style="font-size:14px;color:${SIRAJA_COLORS.textMuted};text-align:center;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      ﴿ وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ﴾ — واصل مسيرتك، نحن معك 🌿
    </p>
  `;

  const text = `تهانينا يا ${studentName}!\n\n${icon} ${achievementTitle}\n${achievementDescription}${points != null ? `\n+${points} نقطة` : ''}\n\nعرض إنجازاتك: ${dashboardUrl}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
