import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getCardHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export interface MonthlyReportSummary {
  totalSessions: number;
  totalVerses: number;
  completedJuz?: number;
  averageScore: number;
  perfectSessions: number;
  longestStreak: number;
}

export interface MonthlyReportTemplateData extends BaseTemplateData {
  studentName: string;
  monthLabel: string;
  summary: MonthlyReportSummary;
  highlights?: string[];
  reportUrl: string;
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
    highlights,
    reportUrl,
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
  } = data;

  const subject = `📅 تقريرك الشهري — ${monthLabel} | ${tenantName}`;

  const illustration = getEmailIllustration('monthly-report', primaryColor, accentColor);

  const ctaButton = getButtonHtml({
    href:  reportUrl,
    label: '📋 التقرير الشهري الكامل',
    primaryColor,
    accentColor,
    width: 250,
  });

  const statItems = [
    { label: 'إجمالي الجلسات',   value: summary.totalSessions,  icon: '📚' },
    { label: 'آيات محفوظة',       value: summary.totalVerses,    icon: '📖' },
    { label: 'جلسات مثالية',     value: summary.perfectSessions, icon: '⭐' },
    { label: 'متوسط الدرجات',   value: `${summary.averageScore}%`, icon: '🎯' },
    { label: 'أطول سلسلة',       value: `${summary.longestStreak} يوم`, icon: '🔥' },
    { label: 'أجزاء مكتملة',    value: summary.completedJuz ?? 0, icon: '📗' },
  ];

  function statCell(s: typeof statItems[0]): string {
    return `<td align="center" valign="top" width="33%"
                style="padding:18px 8px;border-left:1px solid ${SIRAJA_COLORS.borderLight};">
      <p style="margin:0 0 4px;font-size:22px;line-height:1;">${s.icon}</p>
      <p style="margin:0 0 3px;font-size:24px;font-weight:900;color:${primaryColor};
                font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1;">${s.value}</p>
      <p style="margin:0;font-size:11px;color:${SIRAJA_COLORS.textMuted};
                font-family:'Cairo',Tahoma,Arial,sans-serif;font-weight:500;">${s.label}</p>
    </td>`;
  }

  const row1 = statItems.slice(0, 3);
  const row2 = statItems.slice(3, 6);

  const statsGrid = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       style="margin:20px 0;background:${SIRAJA_COLORS.bgPage};border-radius:16px;
              overflow:hidden;border:1px solid ${SIRAJA_COLORS.borderLight};
              box-shadow:0 2px 12px rgba(0,0,0,0.04);">
  <tr>${row1.map(s => statCell(s)).join('')}</tr>
  <tr>
    <td colspan="3" height="1" style="height:1px;line-height:1px;font-size:0;
                                       background-color:${SIRAJA_COLORS.borderLight};">&nbsp;</td>
  </tr>
  <tr>${row2.map(s => statCell(s)).join('')}</tr>
</table>`;

  const highlightsSection = highlights?.length
    ? `<div style="margin:20px 0;background:${SIRAJA_COLORS.bgPage};border-radius:16px;
                   border:1px solid ${SIRAJA_COLORS.borderLight};padding:20px 24px;">
         <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:${primaryColor};
                   font-family:'Cairo',Tahoma,Arial,sans-serif;">✨ أبرز ما حققته هذا الشهر:</p>
         ${highlights.map(h => `
           <p style="margin:0 0 8px;font-size:14px;color:${SIRAJA_COLORS.textSecondary};
                     font-family:'Cairo',Tahoma,Arial,sans-serif;padding-right:20px;position:relative;">
             <span style="color:${accentColor};font-weight:700;margin-left:8px;">✦</span>${h}
           </p>`).join('')}
       </div>`
    : '';

  const scoreCard = summary.averageScore >= 90
    ? getCardHtml(`🏆 <strong>أداء استثنائي!</strong> متوسط درجاتك ${summary.averageScore}% — في أعلى 10% من الطلاب!`, 'success')
    : summary.averageScore >= 75
    ? getCardHtml(`⭐ <strong>أداء ممتاز!</strong> متوسط درجاتك ${summary.averageScore}% — استمر على هذا المستوى!`, 'info')
    : getCardHtml(`💪 <strong>تقدم جيد!</strong> متوسط درجاتك ${summary.averageScore}% — مع مزيد من الجهد ستصل إلى القمة!`, 'warning');

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:23px;font-weight:800;margin:0 0 8px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      تقريرك الشهري 📅
    </h2>
    <div style="width:52px;height:3px;background:linear-gradient(to left,transparent,${accentColor},${primaryColor});
                border-radius:99px;margin:0 0 24px;"></div>

    <p style="margin:0 0 20px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      بارك الله فيك <strong style="color:${SIRAJA_COLORS.textPrimary};">${studentName}</strong>،
      إليك تقرير أدائك الشهري لشهر <strong style="color:${SIRAJA_COLORS.textPrimary};">${monthLabel}</strong>:
    </p>

    ${statsGrid}
    ${scoreCard}
    ${highlightsSection}

    ${ctaButton}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:28px 0 18px;"/>

    <p style="font-size:14px;color:${SIRAJA_COLORS.textMuted};text-align:center;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      كل آية تحفظها هي نور يضيء طريقك 🌟
    </p>
  `;

  const text = `تقرير شهر ${monthLabel}\n\nبارك الله فيك ${studentName}!\n\nإحصائياتك:\n- إجمالي الجلسات: ${summary.totalSessions}\n- آيات محفوظة: ${summary.totalVerses}\n- جلسات مثالية: ${summary.perfectSessions}\n- متوسط الدرجات: ${summary.averageScore}%\n- أطول سلسلة: ${summary.longestStreak} يوم${summary.completedJuz ? `\n- أجزاء مكتملة: ${summary.completedJuz}` : ''}\n\n${highlights?.length ? `أبرز الإنجازات:\n${highlights.map(h => `- ${h}`).join('\n')}\n\n` : ''}التقرير الكامل: ${reportUrl}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
