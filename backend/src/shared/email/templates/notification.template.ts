import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getCardHtml, SIRAJA_BRAND_DEFAULTS } from '../brand/brand-config';

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
    actionLabel  = 'عرض التفاصيل',
    type         = 'info',
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
    supportEmail = SIRAJA_BRAND_DEFAULTS.supportEmail,
  } = data;

  const iconMap: Record<string, string> = { info: '📢', success: '✅', warning: '⚠️' };
  const icon = iconMap[type] ?? '📢';

  const subject = `${icon} ${title} — ${tenantName}`;

  // Map notification type to card type (success → success, warning → warning, info → info)
  const cardType = type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info';
  const messageCard = getCardHtml(message, cardType);

  const ctaButton = actionUrl
    ? getButtonHtml({ href: actionUrl, label: actionLabel, primaryColor, accentColor, width: 220 })
    : '';

  const actionTable = actionUrl
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
         <tr><td align="center" style="padding:24px 0 0;">${ctaButton}</td></tr>
       </table>`
    : '';

  const body = `
    <h2 style="color:${primaryColor};font-size:21px;font-weight:700;margin:0 0 20px;
               padding-bottom:10px;border-bottom:2px solid #EEF0EC;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      ${icon} ${title}
    </h2>

    <p style="margin:0 0 16px;color:#4B5563;font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مرحباً <strong style="color:#1F2937;">${recipientName}</strong>،
    </p>

    ${messageCard}

    ${actionTable}

    <hr style="border:none;border-top:1px solid #EEF0EC;margin:24px 0;"/>

    <p style="font-size:13px;color:#9CA3AF;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      للمساعدة تواصل معنا على
      <a href="mailto:${supportEmail}" style="color:${primaryColor};">${supportEmail}</a>
    </p>
  `;

  const text = `${title}\n\nمرحباً ${recipientName}،\n\n${message}${actionUrl ? `\n\n${actionUrl}` : ''}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
