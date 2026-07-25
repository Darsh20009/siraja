import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getCardHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

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

  const illustration = getEmailIllustration('notification', primaryColor, accentColor);

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

  const headingRule = `<div style="width:48px;height:3px;background:${accentColor};background:linear-gradient(to left,transparent,${accentColor},${primaryColor});border-radius:2px;margin:0 0 22px;"></div>`;

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:22px;font-weight:700;margin:0 0 6px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      ${icon} ${title}
    </h2>
    ${headingRule}

    <p style="margin:0 0 16px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مرحباً <strong style="color:${SIRAJA_COLORS.textPrimary};">${recipientName}</strong>،
    </p>

    ${messageCard}

    ${actionTable}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:26px 0;"/>

    <p style="font-size:13px;color:${SIRAJA_COLORS.textMuted};margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      للمساعدة تواصل معنا على
      <a href="mailto:${supportEmail}" style="color:${primaryColor};">${supportEmail}</a>
    </p>
  `;

  const text = `${title}\n\nمرحباً ${recipientName}،\n\n${message}${actionUrl ? `\n\n${actionUrl}` : ''}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
