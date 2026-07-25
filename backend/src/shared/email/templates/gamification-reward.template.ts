import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export type RewardType  = 'badge' | 'points' | 'level_up' | 'leaderboard';
export type BadgeLevel  = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface GamificationRewardTemplateData extends BaseTemplateData {
  studentName: string;
  rewardTitle: string;
  rewardDescription: string;
  rewardType?:   RewardType;
  pointsEarned?: number;
  totalPoints?:  number;
  badgeLevel?:   BadgeLevel;
  /** Leaderboard rank (only relevant when rewardType === 'leaderboard') */
  rank?: number;
  dashboardUrl: string;
}

const BADGE_CONFIG: Record<BadgeLevel, { emoji: string; label: string; color: string }> = {
  bronze:   { emoji: '🥉', label: 'برونزية',   color: '#CD7F32' },
  silver:   { emoji: '🥈', label: 'فضية',      color: '#C0C0C0' },
  gold:     { emoji: '🥇', label: 'ذهبية',     color: '#C9A84C' },
  platinum: { emoji: '💎', label: 'بلاتينية',  color: '#E5E4E2' },
};

const REWARD_ICONS: Record<RewardType, string> = {
  badge:       '🏅',
  points:      '⭐',
  level_up:    '🚀',
  leaderboard: '🏆',
};

export function gamificationRewardEmailTemplate(data: GamificationRewardTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    studentName,
    rewardTitle,
    rewardDescription,
    rewardType  = 'points',
    pointsEarned,
    totalPoints,
    badgeLevel,
    rank,
    dashboardUrl,
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
  } = data;

  const icon      = REWARD_ICONS[rewardType] ?? '⭐';
  const badgeCfg  = badgeLevel ? BADGE_CONFIG[badgeLevel] : null;
  const subject   = `${icon} مكافأة جديدة! ${rewardTitle} — ${tenantName}`;

  const illustration = getEmailIllustration('gamification-reward', primaryColor, accentColor);

  const ctaButton = getButtonHtml({
    href:  dashboardUrl,
    label: `${icon} عرض مكافآتك`,
    primaryColor,
    accentColor,
    width: 240,
  });

  const headingRule = `<div style="width:48px;height:3px;background:${accentColor};background:linear-gradient(to left,transparent,${accentColor},${primaryColor});border-radius:2px;margin:0 0 22px;"></div>`;

  // ── Reward card ──────────────────────────────────────────────────────────────
  const badgeRow = badgeCfg
    ? `<p style="margin:0 0 6px;font-size:28px;line-height:1;">${badgeCfg.emoji}</p>
       <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${badgeCfg.color};
                 font-family:Tahoma,Arial,sans-serif;">شارة ${badgeCfg.label}</p>`
    : '';

  const rankRow = rank != null
    ? `<p style="margin:12px 0 0;font-size:14px;font-weight:700;color:${primaryColor};
                 font-family:'Cairo',Tahoma,Arial,sans-serif;">🏆 المرتبة # ${rank} في لوحة الشرف</p>`
    : '';

  const pointsRow = pointsEarned != null
    ? `<p style="margin:10px 0 0;font-size:14px;font-weight:700;color:${accentColor};
                 font-family:'Cairo',Tahoma,Arial,sans-serif;">+${pointsEarned} نقطة${totalPoints != null ? ` • الإجمالي: ${totalPoints}` : ''}</p>`
    : '';

  const rewardCard = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       style="margin:20px 0;border-radius:12px;overflow:hidden;border:2px solid ${accentColor}38;">
  <tr>
    <td height="4" bgcolor="${accentColor}" style="height:4px;line-height:4px;font-size:0;">&nbsp;</td>
  </tr>
  <tr>
    <td align="center" bgcolor="${SIRAJA_COLORS.bgPage}"
        style="background:${SIRAJA_COLORS.bgPage};padding:24px 20px;">
      ${badgeRow}
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:${primaryColor};
                font-family:'Cairo',Tahoma,Arial,sans-serif;">${rewardTitle}</p>
      <p style="margin:0;font-size:14px;color:${SIRAJA_COLORS.textSecondary};
                line-height:1.7;font-family:'Cairo',Tahoma,Arial,sans-serif;">${rewardDescription}</p>
      ${pointsRow}
      ${rankRow}
    </td>
  </tr>
</table>`;

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:22px;font-weight:700;margin:0 0 6px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      ${icon} مكافأة جديدة لك!
    </h2>
    ${headingRule}

    <p style="margin:0 0 16px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      رائع يا <strong style="color:${SIRAJA_COLORS.textPrimary};">${studentName}</strong>!
      لقد كسبت مكافأة جديدة تقديراً لجهودك في رحلة حفظ القرآن الكريم:
    </p>

    ${rewardCard}

    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr><td align="center" style="padding:20px 0 0;">${ctaButton}</td></tr>
    </table>

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:28px 0 22px;"/>

    <p style="font-size:14px;color:${SIRAJA_COLORS.textMuted};text-align:center;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      كل نقطة تكسبها هي خطوة على طريق الإتقان — لا تتوقف ✨
    </p>
  `;

  const text = `مكافأة جديدة يا ${studentName}!\n\n${icon} ${rewardTitle}\n${rewardDescription}${pointsEarned != null ? `\n+${pointsEarned} نقطة` : ''}${totalPoints != null ? ` • الإجمالي: ${totalPoints}` : ''}${rank != null ? `\nالمرتبة: #${rank}` : ''}\n\nعرض مكافآتك: ${dashboardUrl}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
