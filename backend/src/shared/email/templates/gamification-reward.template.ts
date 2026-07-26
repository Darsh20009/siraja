import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getEmailIllustration, escapeHtml, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export type RewardType =
  | 'points'
  | 'badge'
  | 'level-up'
  | 'streak-bonus'
  | 'challenge'
  | 'weekly-top'
  | 'monthly-top';

export type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface GamificationRewardTemplateData extends BaseTemplateData {
  studentName:      string;
  rewardTitle:      string;
  rewardDescription: string;
  rewardType?:      RewardType;
  pointsEarned?:    number;
  totalPoints?:     number;
  badgeLevel?:      BadgeLevel;
  rank?:            number;
  dashboardUrl:     string;
}

export function gamificationRewardEmailTemplate(data: GamificationRewardTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    studentName,
    rewardTitle,
    rewardDescription,
    rewardType    = 'points',
    pointsEarned,
    totalPoints,
    badgeLevel,
    rank,
    dashboardUrl,
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
  } = data;

  // ── HTML-safe aliases ──────────────────────────────────────────────────────
  const sStudent = escapeHtml(studentName);
  const sTitle   = escapeHtml(rewardTitle);
  const sDesc    = escapeHtml(rewardDescription);
  const sTenant  = escapeHtml(tenantName);

  const typeIcons: Record<RewardType, string> = {
    'points':      '💎',
    'badge':       '🎖️',
    'level-up':    '⬆️',
    'streak-bonus':'🔥',
    'challenge':   '🏅',
    'weekly-top':  '🥇',
    'monthly-top': '🏆',
  };

  const badgeConfig: Record<BadgeLevel, { emoji: string; label: string; color: string }> = {
    bronze:   { emoji: '🥉', label: 'برونزي',  color: '#CD7F32' },
    silver:   { emoji: '🥈', label: 'فضي',     color: '#A8A9AD' },
    gold:     { emoji: '🥇', label: 'ذهبي',    color: '#FFD700' },
    platinum: { emoji: '💎', label: 'بلاتيني', color: '#E5E4E2' },
  };

  const icon = typeIcons[rewardType] ?? '💎';
  const subject = `${icon} مكافأة جديدة! ${rewardTitle} — ${tenantName}`;

  const illustration = getEmailIllustration('gamification-reward', primaryColor, accentColor);

  const ctaButton = getButtonHtml({
    href:  dashboardUrl,
    label: '🎮 عرض مكافآتي',
    primaryColor,
    accentColor,
    width: 230,
  });

  const badgeChip = badgeLevel
    ? (() => {
        const bc = badgeConfig[badgeLevel];
        return `<span style="display:inline-block;background:${bc.color}22;color:${bc.color};
                              border:1.5px solid ${bc.color}66;border-radius:99px;
                              font-size:13px;font-weight:800;padding:4px 16px;margin-top:10px;
                              font-family:'Cairo',Tahoma,Arial,sans-serif;">
                  ${bc.emoji} شارة ${bc.label}
                </span>`;
      })()
    : '';

  const rankCard = rank != null
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
              style="margin:16px 0;background:linear-gradient(135deg,${primaryColor}08,${accentColor}08);
                     border-radius:12px;border:1px solid ${accentColor}30;">
         <tr>
           <td align="center" style="padding:16px 20px;">
             <p style="margin:0;font-size:13px;color:${SIRAJA_COLORS.textMuted};
                       font-family:'Cairo',Tahoma,Arial,sans-serif;">ترتيبك على لوحة الشرف</p>
             <p style="margin:4px 0 0;font-size:32px;font-weight:900;color:${accentColor};
                       font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1;">#${rank}</p>
           </td>
         </tr>
       </table>`
    : '';

  const pointsRow = (pointsEarned != null || totalPoints != null)
    ? `<div style="margin:14px 0;text-align:center;">
         ${pointsEarned != null ? `<span style="display:inline-block;background:${accentColor}20;color:${accentColor};
                   border:1.5px solid ${accentColor}44;border-radius:99px;
                   font-size:14px;font-weight:800;padding:5px 18px;margin:0 4px;
                   font-family:'Cairo',Tahoma,Arial,sans-serif;">+${pointsEarned} نقطة</span>` : ''}
         ${totalPoints != null ? `<span style="display:inline-block;background:${primaryColor}10;color:${primaryColor};
                   border:1px solid ${primaryColor}30;border-radius:99px;
                   font-size:13px;font-weight:700;padding:5px 16px;margin:0 4px;
                   font-family:'Cairo',Tahoma,Arial,sans-serif;">الإجمالي: ${totalPoints} نقطة</span>` : ''}
       </div>`
    : '';

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:23px;font-weight:800;margin:0 0 8px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مكافأة جديدة! ${icon}
    </h2>
    <div class="heading-rule" style="width:52px;height:3px;background:linear-gradient(to left,transparent,${accentColor},${primaryColor});
                border-radius:99px;margin:0 0 24px;"></div>

    <p style="margin:0 0 20px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      تهانينا <strong style="color:${SIRAJA_COLORS.textPrimary};">${sStudent}</strong>!
      حصلت على مكافأة جديدة تقديراً لجهودك:
    </p>

    <!-- Reward card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
           style="margin:0 0 20px;border-radius:16px;overflow:hidden;
                  border:2px solid ${accentColor}44;
                  background:linear-gradient(135deg,${accentColor}06 0%,${primaryColor}04 100%);
                  box-shadow:0 4px 20px ${accentColor}18;">
      <tr>
        <td style="padding:24px 28px;text-align:center;">
          <p style="margin:0 0 8px;font-size:44px;line-height:1;">${icon}</p>
          <p style="margin:0 0 8px;font-size:19px;font-weight:800;color:${primaryColor};
                    font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1.3;">${sTitle}</p>
          <p style="margin:0;font-size:14px;color:${SIRAJA_COLORS.textSecondary};
                    font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1.7;">${sDesc}</p>
          ${badgeChip}
        </td>
      </tr>
    </table>

    ${pointsRow}
    ${rankCard}

    ${ctaButton}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:28px 0 18px;"/>

    <p style="font-size:14px;color:${SIRAJA_COLORS.textMuted};text-align:center;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      استمر في التميز — أنت تصنع الفارق! 🌟
    </p>
  `;

  const text = `مكافأة جديدة! ${rewardTitle}\n\nتهانينا ${studentName}!\n\n${rewardDescription}\n\n${pointsEarned ? `نقاط مكتسبة: +${pointsEarned}\n` : ''}${totalPoints ? `إجمالي نقاطك: ${totalPoints}\n` : ''}${badgeLevel ? `الشارة: ${badgeConfig[badgeLevel].label}\n` : ''}${rank ? `ترتيبك: #${rank}\n` : ''}\nعرض مكافآتك: ${dashboardUrl}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
