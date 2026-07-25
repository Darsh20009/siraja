import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getCardHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export type SecurityAlertType =
  | 'login'
  | 'password_changed'
  | 'email_changed'
  | 'suspicious_activity'
  | 'new_device';

export interface SecurityAlertTemplateData extends BaseTemplateData {
  fullName: string;
  alertType: SecurityAlertType;
  details?: {
    device?:   string;
    location?: string;
    ip?:       string;
    time?:     string;
  };
  /** URL for the user to secure their account (e.g. change password page) */
  actionUrl?:   string;
  actionLabel?: string;
}

const ALERT_CONFIG: Record<SecurityAlertType, { title: string; message: string; icon: string }> = {
  login: {
    icon: '🔐',
    title: 'تسجيل دخول جديد لحسابك',
    message: 'لاحظنا تسجيل دخول جديداً إلى حسابك. إذا كنت أنت، يمكنك تجاهل هذه الرسالة.',
  },
  password_changed: {
    icon: '🔑',
    title: 'تم تغيير كلمة المرور',
    message: 'تم تغيير كلمة مرور حسابك بنجاح. إذا لم تقم بذلك، يُرجى تأمين حسابك فوراً.',
  },
  email_changed: {
    icon: '✉️',
    title: 'تم تغيير البريد الإلكتروني',
    message: 'تم تغيير البريد الإلكتروني المرتبط بحسابك. إذا لم تقم بذلك، تواصل معنا فوراً.',
  },
  suspicious_activity: {
    icon: '⚠️',
    title: 'نشاط مريب على حسابك',
    message: 'رصدنا نشاطاً غير معتاد على حسابك. يُرجى مراجعة الأجهزة المرتبطة وتغيير كلمة المرور.',
  },
  new_device: {
    icon: '📱',
    title: 'تسجيل دخول من جهاز جديد',
    message: 'تم تسجيل الدخول إلى حسابك من جهاز لم نتعرف عليه من قبل.',
  },
};

export function securityAlertEmailTemplate(data: SecurityAlertTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    fullName,
    alertType,
    details = {},
    actionUrl,
    actionLabel  = '🔒 تأمين الحساب الآن',
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
    supportEmail = SIRAJA_BRAND_DEFAULTS.supportEmail,
  } = data;

  const cfg     = ALERT_CONFIG[alertType] ?? ALERT_CONFIG.suspicious_activity;
  const subject = `${cfg.icon} تنبيه أمني — ${cfg.title} | ${tenantName}`;

  const illustration = getEmailIllustration('security-alert', primaryColor, accentColor);

  // ── Details table ────────────────────────────────────────────────────────────
  const detailRows = [
    details.device   && `<tr><td style="padding:9px 14px;font-weight:600;color:${SIRAJA_COLORS.textPrimary};background:${SIRAJA_COLORS.bgPage};border-bottom:1px solid ${SIRAJA_COLORS.borderLight};font-family:'Cairo',Tahoma,Arial,sans-serif;font-size:13.5px;white-space:nowrap;">الجهاز</td><td style="padding:9px 14px;color:${SIRAJA_COLORS.textSecondary};background:${SIRAJA_COLORS.bgCard};border-bottom:1px solid ${SIRAJA_COLORS.borderLight};font-family:Tahoma,Arial,sans-serif;font-size:13.5px;direction:ltr;text-align:left;">${details.device}</td></tr>`,
    details.location && `<tr><td style="padding:9px 14px;font-weight:600;color:${SIRAJA_COLORS.textPrimary};background:${SIRAJA_COLORS.bgPage};border-bottom:1px solid ${SIRAJA_COLORS.borderLight};font-family:'Cairo',Tahoma,Arial,sans-serif;font-size:13.5px;white-space:nowrap;">الموقع</td><td style="padding:9px 14px;color:${SIRAJA_COLORS.textSecondary};background:${SIRAJA_COLORS.bgCard};border-bottom:1px solid ${SIRAJA_COLORS.borderLight};font-family:Tahoma,Arial,sans-serif;font-size:13.5px;direction:ltr;text-align:left;">${details.location}</td></tr>`,
    details.ip       && `<tr><td style="padding:9px 14px;font-weight:600;color:${SIRAJA_COLORS.textPrimary};background:${SIRAJA_COLORS.bgPage};border-bottom:1px solid ${SIRAJA_COLORS.borderLight};font-family:'Cairo',Tahoma,Arial,sans-serif;font-size:13.5px;white-space:nowrap;">عنوان IP</td><td style="padding:9px 14px;color:${SIRAJA_COLORS.textSecondary};background:${SIRAJA_COLORS.bgCard};border-bottom:1px solid ${SIRAJA_COLORS.borderLight};font-family:Tahoma,Arial,sans-serif;font-size:13.5px;direction:ltr;text-align:left;">${details.ip}</td></tr>`,
    details.time     && `<tr><td style="padding:9px 14px;font-weight:600;color:${SIRAJA_COLORS.textPrimary};background:${SIRAJA_COLORS.bgPage};font-family:'Cairo',Tahoma,Arial,sans-serif;font-size:13.5px;white-space:nowrap;">الوقت</td><td style="padding:9px 14px;color:${SIRAJA_COLORS.textSecondary};background:${SIRAJA_COLORS.bgCard};font-family:Tahoma,Arial,sans-serif;font-size:13.5px;direction:ltr;text-align:left;">${details.time}</td></tr>`,
  ].filter(Boolean).join('');

  const detailsTable = detailRows
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
             style="margin:16px 0;border-radius:8px;overflow:hidden;border:1px solid ${SIRAJA_COLORS.borderLight};">
        <tbody>${detailRows}</tbody>
      </table>`
    : '';

  const securityCard = getCardHtml(
    '⚠️&nbsp; إذا لم تقم بهذا الإجراء، يرجى تغيير كلمة مرورك فوراً وإخطارنا.',
    'warning',
  );

  const ctaButton = actionUrl
    ? getButtonHtml({ href: actionUrl, label: actionLabel, primaryColor: '#DC2626', accentColor: '#DC2626', width: 260 })
    : '';

  const actionTable = actionUrl
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
         <tr><td align="center" style="padding:20px 0 0;">${ctaButton}</td></tr>
       </table>`
    : '';

  const body = `
    ${illustration}

    <!-- Alert badge + heading -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
           style="margin-bottom:20px;">
      <tr>
        <td style="padding:0;">
          <span style="display:inline-block;background-color:#DC2626;color:#ffffff;
                       padding:3px 14px;border-radius:20px;font-size:12px;font-weight:700;
                       letter-spacing:0.5px;font-family:Tahoma,Arial,sans-serif;margin-bottom:10px;">
            ${cfg.icon}&nbsp; تنبيه أمني
          </span>
          <h2 style="color:${SIRAJA_COLORS.textPrimary};font-size:21px;font-weight:700;margin:8px 0 0;
                     font-family:'Cairo',Tahoma,Arial,sans-serif;">${cfg.title}</h2>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مرحباً <strong style="color:${SIRAJA_COLORS.textPrimary};">${fullName}</strong>،
    </p>

    <p style="margin:0 0 16px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">${cfg.message}</p>

    ${detailsTable}
    ${securityCard}
    ${actionTable}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:26px 0;"/>

    <p style="font-size:13px;color:${SIRAJA_COLORS.textMuted};margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      إذا كان هذا النشاط من طرفك، تجاهل هذه الرسالة. للمساعدة:
      <a href="mailto:${supportEmail}" style="color:#DC2626;">${supportEmail}</a>
    </p>
  `;

  const detailsText = Object.entries(details).filter(([,v]) => v)
    .map(([k, v]) => `  ${k}: ${v}`).join('\n');

  const text = `[تنبيه أمني] ${cfg.title}\n\nمرحباً ${fullName}،\n\n${cfg.message}${detailsText ? '\n\nالتفاصيل:\n' + detailsText : ''}${actionUrl ? '\n\n' + actionUrl : ''}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
