import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export type AchievementType =
  | 'memorization'
  | 'streak'
  | 'attendance'
  | 'revision'
  | 'milestone'
  | 'special';

export interface AchievementTemplateData extends BaseTemplateData {
  studentName:             string;
  achievementTitle:        string;
  achievementDescription:  string;
  achievementType?:        AchievementType;
  points?:                 number;
  level?:                  string;
  dashboardUrl:            string;
  shareUrl?:               string;
}

export function achievementEmailTemplate(data: AchievementTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    studentName,
    achievementTitle,
    achievementDescription,
    achievementType = 'milestone',
    points,
    level,
    dashboardUrl,
    shareUrl,
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
  } = data;

  const typeIcons: Record<AchievementType, string> = {
    memorization: '📖',
    streak:       '🔥',
    attendance:   '🎯',
    revision:     '⭐',
    milestone:    '🏆',
    special:      '✨',
  };

  const icon = typeIcons[achievementType] ?? '🏆';
  const subject = `${icon} إنجاز جديد! ${achievementTitle} — ${tenantName}`;

  const illustration = getEmailIllustration('achievement', primaryColor, accentColor);

  const ctaButton = getButtonHtml({
    href:  dashboardUrl,
    label: '🏆 عرض إنجازاتي',
    primaryColor,
    accentColor,
    width: 230,
  });

  const shareButton = shareUrl
    ? getButtonHtml({
        href:  shareUrl,
        label: '✨ مشاركة الإنجاز',
        primaryColor: SIRAJA_COLORS.accentDeep,
        accentColor:  accentColor,
        width: 210,
      })
    : '';

  const pointsChip = points != null
    ? `<span style="display:inline-block;background:${accentColor}22;color:${accentColor};
                    border:1px solid ${accentColor}55;border-radius:99px;
                    font-size:13px;font-weight:800;padding:4px 14px;margin-right:8px;
                    font-family:'Cairo',Tahoma,Arial,sans-serif;">+${points} نقطة</span>`
    : '';

  const levelChip = level
    ? `<span style="display:inline-block;background:${primaryColor}15;color:${primaryColor};
                    border:1px solid ${primaryColor}30;border-radius:99px;
                    font-size:12px;font-weight:700;padding:4px 14px;
                    font-family:'Cairo',Tahoma,Arial,sans-serif;">${level}</span>`
    : '';

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:23px;font-weight:800;margin:0 0 8px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مبروك! إنجاز جديد 🎉
    </h2>
    <div style="width:52px;height:3px;background:linear-gradient(to left,transparent,${accentColor},${primaryColor});
                border-radius:99px;margin:0 0 24px;"></div>

    <p style="margin:0 0 20px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      أحسنت <strong style="color:${SIRAJA_COLORS.textPrimary};">${studentName}</strong>!
      لقد حققت إنجازاً رائعاً يُفخر به:
    </p>

    <!-- Achievement card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
           style="margin:0 0 24px;border-radius:16px;overflow:hidden;
                  border:2px solid ${accentColor}55;
                  background:linear-gradient(135deg,${accentColor}08 0%,${primaryColor}06 100%);
                  box-shadow:0 4px 20px ${accentColor}20;">
      <tr>
        <td style="padding:24px 28px;text-align:center;">
          <p style="margin:0 0 8px;font-size:44px;line-height:1;">${icon}</p>
          <p style="margin:0 0 8px;font-size:20px;font-weight:800;color:${primaryColor};
                    font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1.3;">${achievementTitle}</p>
          <p style="margin:0 0 16px;font-size:14px;color:${SIRAJA_COLORS.textSecondary};
                    font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1.7;">${achievementDescription}</p>
          <div style="margin:0;">${pointsChip}${levelChip}</div>
        </td>
      </tr>
    </table>

    <!-- CTA buttons -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr>
        <td align="center" style="padding:0 0 8px;">
          ${ctaButton}
        </td>
      </tr>
      ${shareButton ? `<tr><td align="center" style="padding:0;">${shareButton}</td></tr>` : ''}
    </table>

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:28px 0 18px;"/>

    <p style="font-size:14px;color:${SIRAJA_COLORS.textMuted};text-align:center;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      وفقك الله وبارك في جهدك 🤲
    </p>
  `;

  const text = `مبروك! ${achievementTitle}\n\nأحسنت ${studentName}!\n\n${achievementDescription}\n\n${points ? `نقاط مكتسبة: +${points}\n` : ''}${level ? `المستوى: ${level}\n` : ''}\nعرض إنجازاتك: ${dashboardUrl}\n${shareUrl ? `مشاركة: ${shareUrl}\n` : ''}\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
