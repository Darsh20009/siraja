import { baseEmailTemplate, BaseTemplateData } from './base.template';

export interface NotificationTemplateData extends BaseTemplateData {
  recipientName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  type?: 'info' | 'success' | 'warning';
}

export function notificationEmailTemplate(data: NotificationTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    recipientName,
    title,
    message,
    actionUrl,
    actionLabel = 'عرض التفاصيل',
    type = 'info',
    tenantName = 'سراج',
  } = data;

  const iconMap = { info: '📢', success: '✅', warning: '⚠️' };
  const icon = iconMap[type] ?? '📢';

  const subject = `${icon} ${title} — ${tenantName}`;

  const actionButton = actionUrl
    ? `<div class="btn-wrap"><a href="${actionUrl}" class="btn">${actionLabel}</a></div>`
    : '';

  const cardClass = type === 'warning' ? 'warn-card' : type === 'success' ? 'info-card' : 'info-card';

  const body = `
    <h2>${icon} ${title}</h2>

    <p>مرحباً <strong>${recipientName}</strong>،</p>

    <div class="${cardClass}">
      ${message}
    </div>

    ${actionButton}

    <hr class="section-divider"/>

    <p style="font-size:13px;color:#888;">
      للمساعدة تواصل معنا على
      <a href="mailto:support@siraja.website" style="color:#1A6B4A;">support@siraja.website</a>
    </p>
  `;

  const text = `${title}\n\nمرحباً ${recipientName}،\n\n${message}${actionUrl ? `\n\n${actionUrl}` : ''}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
