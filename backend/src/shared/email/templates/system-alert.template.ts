import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getCardHtml, getEmailIllustration, escapeHtml, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export interface SystemAlertTemplateData extends BaseTemplateData {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  details?: Record<string, string | number | boolean>;
  timestamp: string;
}

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
  } = data;

  // ── HTML-safe aliases ──────────────────────────────────────────────────────
  const sTitle  = escapeHtml(title);
  const sTenant = escapeHtml(tenantName);

  const cfg = {
    info:     { icon: 'ℹ️', label: 'معلومة',  badge: primaryColor,  cardType: 'info'    as const, subject: `ℹ️ تنبيه نظام — ` },
    warning:  { icon: '⚠️', label: 'تحذير',   badge: '#D97706',     cardType: 'warning' as const, subject: `⚠️ تحذير نظام — ` },
    critical: { icon: '🚨', label: 'حرج',     badge: '#DC2626',     cardType: 'danger'  as const, subject: `🚨 تنبيه حرج — ` },
  }[severity];

  const subject = `${cfg.subject}${title}`;

  const illustration = getEmailIllustration('system-alert', primaryColor, accentColor);

  const messageCard = getCardHtml(message, cfg.cardType);

  const detailsTable = details && Object.keys(details).length > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
              style="margin:18px 0;background:${SIRAJA_COLORS.bgPage};border-radius:12px;
                     overflow:hidden;border:1px solid ${SIRAJA_COLORS.borderLight};">
         ${Object.entries(details).map(([k, v], i) => `
         <tr style="${i % 2 === 0 ? '' : `background:${SIRAJA_COLORS.bgCard};`}">
           <td style="padding:10px 16px;font-size:13px;font-weight:700;color:${SIRAJA_COLORS.textSecondary};
                      font-family:'Cairo',Tahoma,Arial,sans-serif;border-bottom:1px solid ${SIRAJA_COLORS.borderLight};
                      white-space:nowrap;width:40%;">${k}</td>
           <td style="padding:10px 16px;font-size:13px;color:${SIRAJA_COLORS.textPrimary};
                      font-family:monospace,'Courier New',Courier;direction:ltr;
                      border-bottom:1px solid ${SIRAJA_COLORS.borderLight};">${String(v)}</td>
         </tr>`).join('')}
       </table>`
    : '';

  const timestampCard = getCardHtml(
    `🕐 <strong>وقت التنبيه:</strong> <span style="direction:ltr;display:inline-block;">${timestamp}</span>`,
    'info'
  );

  const body = `
    ${illustration}

    <!-- Severity badge -->
    <div style="margin:0 0 16px;">
      <span style="display:inline-block;background:${cfg.badge};color:#ffffff;
                   font-size:12px;font-weight:700;padding:4px 14px;border-radius:99px;
                   font-family:'Cairo',Tahoma,Arial,sans-serif;letter-spacing:0.3px;">
        ${cfg.icon} ${cfg.label}
      </span>
    </div>

    <h2 style="color:${primaryColor};font-size:23px;font-weight:800;margin:0 0 8px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      ${sTitle}
    </h2>
    <div class="heading-rule" style="width:52px;height:3px;background:linear-gradient(to left,transparent,${accentColor},${primaryColor});
                border-radius:99px;margin:0 0 24px;"></div>

    ${messageCard}
    ${detailsTable}
    ${timestampCard}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:26px 0 18px;"/>

    <p style="font-size:13px;color:${SIRAJA_COLORS.textMuted};margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1.8;">
      هذا تنبيه آلي من نظام مراقبة منصة ${sTenant}. لا يلزم الرد على هذا البريد.
    </p>
  `;

  const detailsText = details
    ? '\n\nالتفاصيل:\n' + Object.entries(details).map(([k, v]) => `  ${k}: ${v}`).join('\n')
    : '';

  const text = `[${severity.toUpperCase()}] ${title}\n\n${message}${detailsText}\n\nالوقت: ${timestamp}\n\nنظام ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
