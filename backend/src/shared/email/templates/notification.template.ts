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
    actionLabel    = 'عرض التفاصيل',
    type           = 'info',
    tenantName     = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor   = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor    = SIRAJA_BRAND_DEFAULTS.accentColor,
  } = data;

  const icons: Record<string, string> = {
    info:    '📢',
    success: '✅',
    warning: '⚠️',
  };
  const icon = icons[type] ?? '📢';

  const subject = `${icon} ${title} — ${tenantName}`;

  const illustration = getEmailIllustration('notification', primaryColor, accentColor);

  const messageCard = getCardHtml(message, type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'info');

  const ctaButton = actionUrl
    ? getButtonHtml({ href: actionUrl, label: actionLabel, primaryColor, accentColor, width: 240 })
    : '';

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:23px;font-weight:800;margin:0 0 8px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      ${icon}&nbsp; ${title}
    </h2>
    <div style="width:52px;height:3px;background:linear-gradient(to left,transparent,${accentColor},${primaryColor});
                border-radius:99px;margin:0 0 24px;"></div>

    <p style="margin:0 0 20px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مرحباً <strong style="color:${SIRAJA_COLORS.textPrimary};">${recipientName}</strong>،
    </p>

    ${messageCard}

    ${ctaButton}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:28px 0 18px;"/>

    <p style="font-size:13px;color:${SIRAJA_COLORS.textMuted};text-align:center;margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      هذا إشعار تلقائي من منصة ${tenantName}
    </p>
  `;

  const text = `${title}\n\nمرحباً ${recipientName}،\n\n${message}${actionUrl ? `\n\n${actionLabel}: ${actionUrl}` : ''}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
