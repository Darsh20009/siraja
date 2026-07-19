import { baseEmailTemplate, BaseTemplateData } from './base.template';

export interface SystemAlertTemplateData extends BaseTemplateData {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  details?: Record<string, string | number | boolean>;
  timestamp: string;
}

const SEVERITY_CONFIG: Record<string, { color: string; label: string; icon: string; subject: string; cardClass: string }> = {
  info:     { color: '#3B82F6', label: 'معلومات', icon: '📋', subject: '📋 تنبيه نظام',  cardClass: 'info-card'   },
  warning:  { color: '#F59E0B', label: 'تحذير',    icon: '⚠️', subject: '⚠️ تحذير نظام', cardClass: 'warn-card'   },
  critical: { color: '#EF4444', label: 'حرج',      icon: '🚨', subject: '🚨 تنبيه حرج',  cardClass: 'danger-card' },
};

export function systemAlertEmailTemplate(data: SystemAlertTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const { severity, title, message, details, timestamp, tenantName = 'سراج' } = data;
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
  const subject = `${cfg.subject} — ${title}`;

  let detailsHtml = '';
  if (details && Object.keys(details).length > 0) {
    const rows = Object.entries(details)
      .map(([k, v]) => `
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#444;background:#f7f9f8;border-bottom:1px solid #e8f0eb;">${k}</td>
          <td style="padding:8px 12px;color:#333;background:#ffffff;border-bottom:1px solid #e8f0eb;direction:ltr;text-align:left;">${v}</td>
        </tr>`)
      .join('');
    detailsHtml = `
      <table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:8px;overflow:hidden;border:1px solid #e8f0eb;">
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  const body = `
    <div style="border-right:4px solid ${cfg.color};padding-right:16px;margin-bottom:20px;">
      <span style="display:inline-block;background:${cfg.color};color:#fff;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.5px;margin-bottom:10px;">
        ${cfg.icon} ${cfg.label}
      </span>
      <h2 style="margin:0;font-size:20px;color:#1a1a1a;">${title}</h2>
    </div>

    <p style="font-size:15px;line-height:1.85;">${message}</p>

    ${detailsHtml}

    <div class="info-card" style="margin-top:16px;">
      🕐 &nbsp;وقت التنبيه: <strong>${timestamp}</strong>
    </div>

    <p style="font-size:12px;color:#999;margin-top:16px;">
      هذا تنبيه تلقائي من نظام منصة ${tenantName}. لا يتطلب رداً.
    </p>
  `;

  const detailsText = details
    ? '\n\nالتفاصيل:\n' + Object.entries(details).map(([k, v]) => `  ${k}: ${v}`).join('\n')
    : '';

  const text = `[${cfg.label.toUpperCase()}] ${title}\n\n${message}${detailsText}\n\nوقت التنبيه: ${timestamp}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
