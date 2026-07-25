import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getCardHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export interface WeeklySummaryStats {
  sessionsCompleted: number;
  versesMemorized: number;
  revisionScore: number;
  attendanceRate: number;
  streak: number;
}

export interface WeeklySummaryTemplateData extends BaseTemplateData {
  studentName: string;
  weekLabel: string;
  stats: WeeklySummaryStats;
  topAchievement?: string;
  nextGoal?: string;
  dashboardUrl: string;
}

export function weeklySummaryEmailTemplate(data: WeeklySummaryTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    studentName,
    weekLabel,
    stats,
    topAchievement,
    nextGoal,
    dashboardUrl,
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
  } = data;

  const subject = `📊 ملخص أسبوعك في ${tenantName} — ${weekLabel}`;

  const illustration = getEmailIllustration('weekly-summary', primaryColor, accentColor);

  const ctaButton = getButtonHtml({
    href:  dashboardUrl,
    label: '📊 عرض لوحة التحكم',
    primaryColor,
    accentColor,
    width: 240,
  });

  // 2×3 stats grid
  const statItems = [
    { label: 'جلسات مكتملة', value: stats.sessionsCompleted, icon: '📚' },
    { label: 'آيات محفوظة',  value: stats.versesMemorized,   icon: '📖' },
    { label: 'درجة المراجعة', value: `${stats.revisionScore}%`, icon: '⭐' },
    { label: 'معدل الحضور',  value: `${stats.attendanceRate}%`, icon: '🎯' },
    { label: 'أيام متتالية', value: `${stats.streak} يوم`,  icon: '🔥' },
    { label: 'تقييم الأسبوع', value: stats.revisionScore >= 90 ? 'ممتاز' : stats.revisionScore >= 75 ? 'جيد جداً' : 'جيد', icon: '🏅' },
  ];

  const row1 = statItems.slice(0, 3);
  const row2 = statItems.slice(3, 6);

  function statCell(s: typeof statItems[0]): string {
    return `<td align="center" valign="top" width="33%"
                style="padding:18px 8px;border-left:1px solid ${SIRAJA_COLORS.borderLight};">
      <p style="margin:0 0 4px;font-size:22px;line-height:1;">${s.icon}</p>
      <p style="margin:0 0 3px;font-size:22px;font-weight:900;color:${primaryColor};
                font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1;">${s.value}</p>
      <p style="margin:0;font-size:11px;color:${SIRAJA_COLORS.textMuted};
                font-family:'Cairo',Tahoma,Arial,sans-serif;font-weight:500;">${s.label}</p>
    </td>`;
  }

  const statsGrid = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       style="margin:20px 0;background:${SIRAJA_COLORS.bgPage};border-radius:16px;
              overflow:hidden;border:1px solid ${SIRAJA_COLORS.borderLight};
              box-shadow:0 2px 12px rgba(0,0,0,0.04);">
  <tr>
    ${row1.map(s => statCell(s)).join('')}
  </tr>
  <tr>
    <td colspan="3" height="1" style="height:1px;line-height:1px;font-size:0;
                                       background-color:${SIRAJA_COLORS.borderLight};">&nbsp;</td>
  </tr>
  <tr>
    ${row2.map(s => statCell(s)).join('')}
  </tr>
</table>`;

  const achievementCard = topAchievement
    ? getCardHtml(`🏆 <strong>أبرز إنجازات الأسبوع:</strong> ${topAchievement}`, 'success')
    : '';

  const goalCard = nextGoal
    ? getCardHtml(`🎯 <strong>هدف الأسبوع القادم:</strong> ${nextGoal}`, 'info')
    : '';

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:23px;font-weight:800;margin:0 0 8px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      ملخص أسبوعك 📊
    </h2>
    <div style="width:52px;height:3px;background:linear-gradient(to left,transparent,${accentColor},${primaryColor});
                border-radius:99px;margin:0 0 24px;"></div>

    <p style="margin:0 0 20px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      أحسنت <strong style="color:${SIRAJA_COLORS.textPrimary};">${studentName}</strong>!
      إليك ملخص أدائك خلال الأسبوع <strong style="color:${SIRAJA_COLORS.textPrimary};">${weekLabel}</strong>:
    </p>

    ${statsGrid}
    ${achievementCard}
    ${goalCard}

    ${ctaButton}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:28px 0 18px;"/>

    <p style="font-size:14px;color:${SIRAJA_COLORS.textMuted};text-align:center;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      استمر في التقدم، كل خطوة تقربك من هدفك 🌟
    </p>
  `;

  const text = `ملخص أسبوعك — ${weekLabel}\n\nأحسنت ${studentName}!\n\nإحصائياتك:\n- جلسات مكتملة: ${stats.sessionsCompleted}\n- آيات محفوظة: ${stats.versesMemorized}\n- درجة المراجعة: ${stats.revisionScore}%\n- معدل الحضور: ${stats.attendanceRate}%\n- أيام متتالية: ${stats.streak}\n\n${topAchievement ? `أبرز الإنجازات: ${topAchievement}\n` : ''}${nextGoal ? `هدفك القادم: ${nextGoal}\n` : ''}\nلوحة التحكم: ${dashboardUrl}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
