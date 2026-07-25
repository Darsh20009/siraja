import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export interface MonthlyReportSummary {
  totalSessions:   number;
  totalVerses:     number;
  /** Number of complete juz memorized this month (optional) */
  completedJuz?:   number;
  /** Average revision score 0-100 */
  averageScore:    number;
  /** Sessions with perfect score */
  perfectSessions: number;
  /** Longest consecutive-day streak */
  longestStreak:   number;
}

export interface MonthlyReportTemplateData extends BaseTemplateData {
  studentName: string;
  /** Human-readable month label, e.g. "يناير ٢٠٢٦" */
  monthLabel:  string;
  summary:     MonthlyReportSummary;
  /** Key highlights / achievements as text items */
  highlights?: string[];
  reportUrl:   string;
}

export function monthlyReportEmailTemplate(data: MonthlyReportTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    studentName,
    monthLabel,
    summary,
    highlights = [],
    reportUrl,
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
  } = data;

  const subject = `📅 تقريرك الشهري — ${monthLabel} | ${tenantName}`;

  const illustration = getEmailIllustration('monthly-report', primaryColor, accentColor);

  const ctaButton = getButtonHtml({
    href:  reportUrl,
    label: '📄 عرض التقرير الكامل',
    primaryColor,
    accentColor,
    width: 240,
  });

  const headingRule = `<div style="width:48px;height:3px;background:${accentColor};background:linear-gradient(to left,transparent,${accentColor},${primaryColor});border-radius:2px;margin:0 0 22px;"></div>`;

  // ── Stats cells ──────────────────────────────────────────────────────────────
  function statCell(label: string, value: string | number, unit = '') {
    return `<td align="center" style="padding:14px 8px;background:${SIRAJA_COLORS.bgPage};
                border:1px solid ${SIRAJA_COLORS.borderLight};border-radius:8px;width:33%;">
      <p style="font-size:11px;color:${SIRAJA_COLORS.textMuted};margin:0 0 4px;
                font-family:'Cairo',Tahoma,Arial,sans-serif;">${label}</p>
      <p style="font-size:22px;font-weight:800;color:${primaryColor};margin:0;
                font-family:'Cairo',Tahoma,Arial,sans-serif;">${value}<span style="font-size:12px;font-weight:500;color:${SIRAJA_COLORS.textMuted};"> ${unit}</span></p>
    </td>`;
  }

  const statsHtml = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       style="margin:0 0 8px;border-collapse:separate;border-spacing:8px;">
  <tr>
    ${statCell('إجمالي الجلسات',     summary.totalSessions,   'جلسة')}
    ${statCell('الآيات المحفوظة',    summary.totalVerses,     'آية')}
    ${statCell('جلسات مثالية',       summary.perfectSessions, 'جلسة')}
  </tr>
  <tr style="height:8px;"><td colspan="3"></td></tr>
  <tr>
    ${statCell('متوسط التقييم',      `${summary.averageScore}`, '%')}
    ${statCell('أطول سلسلة متواصلة', summary.longestStreak,   'يوم')}
    ${summary.completedJuz != null ? statCell('أجزاء مكتملة', summary.completedJuz, 'جزء 🎉') : statCell('مستوى الأداء', summary.averageScore >= 85 ? '✨ ممتاز' : summary.averageScore >= 70 ? '👍 جيد جداً' : '💪 جيد', '')}
  </tr>
</table>`;

  const highlightsHtml = highlights.length > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
             style="margin:16px 0;border-radius:10px;overflow:hidden;">
        <tr>
          <td width="4" style="width:4px;min-width:4px;background-color:${accentColor};font-size:0;">&nbsp;</td>
          <td style="padding:16px 18px;background:${SIRAJA_COLORS.bgPage};border:1px solid ${SIRAJA_COLORS.borderLight};border-right:none;">
            <p style="font-size:14px;font-weight:700;color:${SIRAJA_COLORS.textPrimary};margin:0 0 10px;
                      font-family:'Cairo',Tahoma,Arial,sans-serif;">🌟 أبرز إنجازات الشهر</p>
            <ul style="margin:0;padding-right:20px;color:${SIRAJA_COLORS.textSecondary};font-size:14px;
                       line-height:1.9;font-family:'Cairo',Tahoma,Arial,sans-serif;">
              ${highlights.map(h => `<li>${h}</li>`).join('')}
            </ul>
          </td>
        </tr>
      </table>`
    : '';

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:22px;font-weight:700;margin:0 0 6px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      📅 تقرير ${monthLabel}
    </h2>
    ${headingRule}

    <p style="margin:0 0 6px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مرحباً <strong style="color:${SIRAJA_COLORS.textPrimary};">${studentName}</strong>،
    </p>
    <p style="margin:0 0 20px;color:${SIRAJA_COLORS.textSecondary};font-size:14px;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      هذا ملخص أدائك خلال شهر <strong style="color:${SIRAJA_COLORS.textPrimary};">${monthLabel}</strong>:
    </p>

    ${statsHtml}
    ${highlightsHtml}

    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr><td align="center" style="padding:20px 0 0;">${ctaButton}</td></tr>
    </table>

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:28px 0 22px;"/>

    <p style="font-size:14px;color:${SIRAJA_COLORS.textMuted};text-align:center;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      نسأل الله أن يبارك في مسيرتك ويثبتك على حفظ كتابه الكريم 🤲
    </p>
  `;

  const text = `تقرير ${monthLabel}\n\nمرحباً ${studentName}،\n\n• الجلسات: ${summary.totalSessions}\n• الآيات: ${summary.totalVerses}\n• متوسط التقييم: ${summary.averageScore}%\n• الجلسات المثالية: ${summary.perfectSessions}\n• أطول سلسلة: ${summary.longestStreak} يوم\n\nعرض التقرير: ${reportUrl}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
