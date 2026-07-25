import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getCardHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export interface SystemAlertTemplateData extends BaseTemplateData {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  details?: Record<string, string | number | boolean>;
  timestamp: string;
}

const SEVERITY_CONFIG: Record<
  string,
  { badgeColor: string; label: string; icon: string; subject: string; cardType: 'info' | 'warning' | 'danger' }
> = {
  info:     { badgeColor: '#1A6B4A', label: 'معلومات', icon: '📋', subject: '📋 تنبيه نظام',  cardType: 'info'    },
  warning:  { badgeColor: '#D97706', label: 'تحذير',    icon: '⚠️', subject: '⚠️ تحذير نظام', cardType: 'warning' },
  critical: { badgeColor: '#DC2626', label: 'حرج',      icon: '🚨', subject: '🚨 تنبيه حرج',  cardType: 'danger'  },
};

export function systemAlertEmailTemplate(data: SystemAlertTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    severity,
    title,
    message,
    details,
    timestamp,
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
    supportEmail = SIRAJA_BRAND_DEFAULTS.supportEmail,
  } = data;

  const cfg     = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
  const subject = `${cfg.subject} — ${title}`;

  const illustration = getEmailIllustration('system-alert', primaryColor, accentColor);

  // ── Details table ────────────────────────────────────────────────────────────
  let detailsHtml = '';
  if (details && Object.keys(details).length > 0) {
    const rows = Object.entries(details).map(([k, v]) => `
      <tr>
        <td style="padding:9px 14px;font-weight:600;color:${SIRAJA_COLORS.textPrimary};background:${SIRAJA_COLORS.bgPage};
                   border-bottom:1px solid ${SIRAJA_COLORS.borderLight};font-family:'Cairo',Tahoma,Arial,sans-serif;
                   font-size:13.5px;white-space:nowrap;">${k}</td>
        <td style="padding:9px 14px;color:${SIRAJA_COLORS.textSecondary};background:${SIRAJA_COLORS.bgCard};
                   border-bottom:1px solid ${SIRAJA_COLORS.borderLight};font-family:Tahoma,Arial,sans-serif;
                   font-size:13.5px;direction:ltr;text-align:left;">${v}</td>
      </tr>`).join('');

    detailsHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
             style="margin:20px 0;border-radius:8px;overflow:hidden;border:1px solid ${SIRAJA_COLORS.borderLight};">
        <tbody>${rows}</tbody>
      </table>`;
  }

  const timestampCard = getCardHtml(`🕐&nbsp; وقت التنبيه: <strong>${timestamp}</strong>`, 'info');

  const body = `
    ${illustration}

    <!-- Severity badge + title -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
           style="border-right:4px solid ${cfg.badgeColor};margin-bottom:24px;">
      <tr>
        <td style="padding:4px 16px;">
          <table cellpadding="0" cellspacing="0" border="0" role="presentation">
            <tr>
              <td style="padding:0 0 10px;">
                <span style="display:inline-block;background-color:${cfg.badgeColor};color:#ffffff;
                             padding:3px 14px;border-radius:20px;font-size:12px;font-weight:700;
                             letter-spacing:0.5px;font-family:Tahoma,Arial,sans-serif;">
                  ${cfg.icon}&nbsp; ${cfg.label}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <h2 style="margin:0;font-size:20px;font-weight:700;color:${SIRAJA_COLORS.textPrimary};
                           font-family:'Cairo',Tahoma,Arial,sans-serif;">${title}</h2>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="font-size:15px;line-height:1.9;color:${SIRAJA_COLORS.textSecondary};margin:0 0 16px;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">${message}</p>

    ${detailsHtml}

    ${timestampCard}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:26px 0 16px;"/>

    <p style="font-size:12px;color:${SIRAJA_COLORS.textMuted};margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      هذا تنبيه تلقائي من نظام منصة ${tenantName}. لا يتطلب رداً.
      للمساعدة: <a href="mailto:${supportEmail}" style="color:${primaryColor};">${supportEmail}</a>
    </p>
  `;

  const detailsText = details
    ? '\n\nالتفاصيل:\n' + Object.entries(details).map(([k, v]) => `  ${k}: ${v}`).join('\n')
    : '';

  const text = `[${cfg.label.toUpperCase()}] ${title}\n\n${message}${detailsText}\n\nوقت التنبيه: ${timestamp}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
