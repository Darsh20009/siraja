import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export interface WeeklySummaryStats {
  sessionsCompleted: number;
  versesMemorized:   number;
  revisionScore:     number; // 0-100 percentage
  attendanceRate:    number; // 0-100 percentage
  streak:            number; // consecutive days
}

export interface WeeklySummaryTemplateData extends BaseTemplateData {
  studentName: string;
  /** Human-readable week label, e.g. "١٤ – ٢٠ يناير ٢٠٢٦" */
  weekLabel:   string;
  stats:       WeeklySummaryStats;
  /** Optional highlight text for the best moment of the week */
  topAchievement?: string;
  /** Optional motivational goal for next week */
  nextGoal?:  string;
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
    label: '📊 عرض لوحة التقدم',
    primaryColor,
    accentColor,
    width: 240,
  });

  const headingRule = `<div style="width:48px;height:3px;background:${accentColor};background:linear-gradient(to left,transparent,${accentColor},${primaryColor});border-radius:2px;margin:0 0 22px;"></div>`;

  // ── Stats grid (2×3) ───────────────────────────────────────────────────────
  function statCell(label: string, value: string | number, unit = '') {
    return `<td align="center" style="padding:14px 8px;background:${SIRAJA_COLORS.bgPage};
                border:1px solid ${SIRAJA_COLORS.borderLight};border-radius:8px;width:50%;">
      <p class="stat-label" style="font-size:11px;color:${SIRAJA_COLORS.textMuted};
                margin:0 0 4px;font-family:'Cairo',Tahoma,Arial,sans-serif;">${label}</p>
      <p class="stat-value" style="font-size:24px;font-weight:800;color:${primaryColor};
                margin:0;font-family:'Cairo',Tahoma,Arial,sans-serif;">${value}<span style="font-size:13px;font-weight:500;color:${SIRAJA_COLORS.textMuted};"> ${unit}</span></p>
    </td>`;
  }

  const statsHtml = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       style="margin:0 0 20px;border-collapse:separate;border-spacing:8px;">
  <tr>
    ${statCell('الجلسات المكتملة',    stats.sessionsCompleted,  'جلسة')}
    ${statCell('الآيات المحفوظة',      stats.versesMemorized,    'آية')}
  </tr>
  <tr style="height:8px;"><td colspan="2"></td></tr>
  <tr>
    ${statCell('نسبة المراجعة',        `${stats.revisionScore}`, '%')}
    ${statCell('نسبة الحضور',           `${stats.attendanceRate}`, '%')}
  </tr>
  <tr style="height:8px;"><td colspan="2"></td></tr>
  <tr>
    ${statCell('الأيام المتواصلة',     stats.streak, 'يوم 🔥')}
    ${statCell('تقييم الأسبوع', stats.revisionScore >= 80 ? '✨ ممتاز' : stats.revisionScore >= 60 ? '👍 جيد' : '💪 تحسّن', '')}
  </tr>
</table>`;

  const achievementHtml = topAchievement
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
             style="margin:0 0 16px;border-radius:10px;overflow:hidden;">
        <tr>
          <td width="4" style="width:4px;min-width:4px;background-color:${accentColor};font-size:0;">&nbsp;</td>
          <td style="padding:14px 18px;background:${SIRAJA_COLORS.bgInfoCard};font-size:14px;
                     color:${SIRAJA_COLORS.textPrimary};font-family:'Cairo',Tahoma,Arial,sans-serif;">
            🏆&nbsp; <strong>أبرز إنجاز الأسبوع:</strong><br/>${topAchievement}
          </td>
        </tr>
      </table>`
    : '';

  const nextGoalHtml = nextGoal
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
             style="margin:0 0 16px;border-radius:10px;overflow:hidden;">
        <tr>
          <td width="4" style="width:4px;min-width:4px;background-color:${primaryColor};font-size:0;">&nbsp;</td>
          <td style="padding:14px 18px;background:${SIRAJA_COLORS.bgInfoCard};font-size:14px;
                     color:${SIRAJA_COLORS.textPrimary};font-family:'Cairo',Tahoma,Arial,sans-serif;">
            🎯&nbsp; <strong>هدف الأسبوع القادم:</strong><br/>${nextGoal}
          </td>
        </tr>
      </table>`
    : '';

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:22px;font-weight:700;margin:0 0 6px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      📊 ملخص أسبوعك
    </h2>
    ${headingRule}

    <p style="margin:0 0 6px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مرحباً <strong style="color:${SIRAJA_COLORS.textPrimary};">${studentName}</strong>،
    </p>
    <p style="margin:0 0 20px;color:${SIRAJA_COLORS.textSecondary};font-size:14px;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      إليك ملخص أدائك خلال الأسبوع: <strong style="color:${SIRAJA_COLORS.textPrimary};">${weekLabel}</strong>
    </p>

    ${statsHtml}
    ${achievementHtml}
    ${nextGoalHtml}

    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr><td align="center" style="padding:16px 0 0;">${ctaButton}</td></tr>
    </table>

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:28px 0 22px;"/>

    <p style="font-size:14px;color:${SIRAJA_COLORS.textMuted};text-align:center;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      واصل المسير — كل آية تحفظها نور على نور ✨
    </p>
  `;

  const text = `ملخص أسبوعك — ${weekLabel}\n\nمرحباً ${studentName}،\n\n• الجلسات: ${stats.sessionsCompleted}\n• الآيات: ${stats.versesMemorized}\n• المراجعة: ${stats.revisionScore}%\n• الحضور: ${stats.attendanceRate}%\n• الأيام المتواصلة: ${stats.streak}\n\nعرض التفاصيل: ${dashboardUrl}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
