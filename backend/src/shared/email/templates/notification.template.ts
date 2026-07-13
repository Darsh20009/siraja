import { baseEmailTemplate, BaseTemplateData } from './base.template';

export interface NotificationTemplateData extends BaseTemplateData {
  recipientName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function notificationEmailTemplate(data: NotificationTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const { recipientName, title, message, actionUrl, actionLabel = 'عرض التفاصيل', tenantName = 'Siraja' } = data;

  const subject = `${title} — ${tenantName}`;

  const actionButton = actionUrl
    ? `<p style="text-align: center; margin: 28px 0;"><a href="${actionUrl}" class="btn">${actionLabel}</a></p>`
    : '';

  const body = `
    <h2>${title}</h2>
    <p>مرحباً <strong>${recipientName}</strong>،</p>
    <p>${message}</p>
    ${actionButton}
  `;

  const text = `${title}\n\nمرحباً ${recipientName}،\n\n${message}${actionUrl ? `\n\n${actionUrl}` : ''}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
