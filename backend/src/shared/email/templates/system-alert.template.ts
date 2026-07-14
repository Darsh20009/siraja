import { baseEmailTemplate, BaseTemplateData } from './base.template';

export interface SystemAlertTemplateData extends BaseTemplateData {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  details?: Record<string, string | number | boolean>;
  timestamp: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: '#3B82F6',
  warning: '#F59E0B',
  critical: '#EF4444',
};

const SEVERITY_LABELS: Record<string, string> = {
  info: 'معلومات',
  warning: 'تحذير',
  critical: 'حرج',
};

const SEVERITY_SUBJECTS: Record<string, string> = {
  info: '📋 تنبيه نظام',
  warning: '⚠️ تحذير نظام',
  critical: '🚨 تنبيه حرج',
};

export function systemAlertEmailTemplate(data: SystemAlertTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const { severity, title, message, details, timestamp, tenantName = 'Siraja' } = data;
  const color = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.info;
  const label = SEVERITY_LABELS[severity] ?? SEVERITY_LABELS.info;
  const subject = `${SEVERITY_SUBJECTS[severity] ?? SEVERITY_SUBJECTS.info} — ${title}`;

  let detailsHtml = '';
  if (details && Object.keys(details).length > 0) {
    const rows = Object.entries(details)
      .map(([k, v]) => `<tr><td style="padding:4px 8px;font-weight:600;">${k}</td><td style="padding:4px 8px;">${v}</td></tr>`)
      .join('');
    detailsHtml = `
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;background:#F9FAFB;border-radius:6px;overflow:hidden;">
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  const body = `
    <div style="border-right:4px solid ${color};padding-right:16px;margin-bottom:20px;">
      <span style="display:inline-block;background:${color};color:#fff;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:0.5px;margin-bottom:8px;">${label}</span>
      <h2 style="margin:0;font-size:18px;">${title}</h2>
    </div>
    <p style="font-size:15px;line-height:1.7;">${message}</p>
    ${detailsHtml}
    <p style="margin-top:20px;font-size:12px;color:#6B7280;">وقت التنبيه: ${timestamp}</p>
    <p style="font-size:12px;color:#6B7280;">هذا تنبيه تلقائي من منصة ${tenantName}.</p>
  `;

  const detailsText = details
    ? '\n\nالتفاصيل:\n' + Object.entries(details).map(([k, v]) => `  ${k}: ${v}`).join('\n')
    : '';

  const text = `[${label.toUpperCase()}] ${title}\n\n${message}${detailsText}\n\nوقت التنبيه: ${timestamp}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
