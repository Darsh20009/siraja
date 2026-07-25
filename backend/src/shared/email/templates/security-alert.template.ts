import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getCardHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export type SecurityAlertType =
  | 'new-login'
  | 'password-changed'
  | 'email-changed'
  | 'account-locked'
  | 'suspicious-activity'
  | 'two-factor-disabled';

export interface SecurityAlertTemplateData extends BaseTemplateData {
  fullName: string;
  alertType: SecurityAlertType;
  details?: {
    device?:   string;
    location?: string;
    ip?:       string;
    time?:     string;
  };
  actionUrl?:   string;
  actionLabel?: string;
}

export function securityAlertEmailTemplate(data: SecurityAlertTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    fullName,
    alertType,
    details,
    actionUrl,
    actionLabel,
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
    supportEmail = SIRAJA_BRAND_DEFAULTS.supportEmail,
  } = data;

  const alerts: Record<SecurityAlertType, { icon: string; title: string; body: string; defaultAction: string }> = {
    'new-login':          { icon: '🔓', title: 'تسجيل دخول جديد',       body: 'تم تسجيل الدخول إلى حسابك من جهاز أو موقع جديد.',     defaultAction: 'هذا أنا — لا مشكلة' },
    'password-changed':   { icon: '🔑', title: 'تغيير كلمة المرور',     body: 'تم تغيير كلمة المرور لحسابك بنجاح.',                    defaultAction: 'تأمين الحساب' },
    'email-changed':      { icon: '📧', title: 'تغيير البريد الإلكتروني', body: 'تم تغيير عنوان البريد الإلكتروني المرتبط بحسابك.',     defaultAction: 'تأمين الحساب' },
    'account-locked':     { icon: '🔒', title: 'تم تعليق الحساب',       body: 'تم تعليق حسابك بسبب محاولات دخول مشبوهة متعددة.',      defaultAction: 'فتح الحساب' },
    'suspicious-activity':{ icon: '⚠️', title: 'نشاط مشبوه',           body: 'رصدنا نشاطاً غير اعتيادي على حسابك يستدعي مراجعتك.',   defaultAction: 'مراجعة النشاط' },
    'two-factor-disabled':{ icon: '🛡️', title: 'تعطيل التحقق الثنائي', body: 'تم تعطيل التحقق بخطوتين على حسابك.',                    defaultAction: 'إعادة التفعيل' },
  };

  const cfg = alerts[alertType];
  const subject = `${cfg.icon} تنبيه أمني — ${cfg.title} | ${tenantName}`;

  const illustration = getEmailIllustration('security-alert', primaryColor, accentColor);

  const ctaButton = actionUrl
    ? getButtonHtml({
        href:    actionUrl,
        label:   actionLabel ?? cfg.defaultAction,
        primaryColor: '#DC2626',
        accentColor:  '#DC2626',
        width:   240,
        variant: 'danger',
      })
    : '';

  const detailRows = details
    ? Object.entries({
        'الجهاز':   details.device,
        'الموقع':   details.location,
        'عنوان IP': details.ip,
        'الوقت':    details.time,
      })
      .filter(([, v]) => v)
      .map(([k, v]) => `
        <tr>
          <td style="padding:9px 16px;font-size:13px;font-weight:700;color:${SIRAJA_COLORS.textSecondary};
                     font-family:'Cairo',Tahoma,Arial,sans-serif;
                     border-bottom:1px solid ${SIRAJA_COLORS.borderLight};width:40%;white-space:nowrap;">${k}</td>
          <td style="padding:9px 16px;font-size:13px;color:${SIRAJA_COLORS.textPrimary};
                     font-family:Tahoma,Arial,sans-serif;direction:ltr;
                     border-bottom:1px solid ${SIRAJA_COLORS.borderLight};">${v}</td>
        </tr>`)
      .join('')
    : '';

  const detailsTable = detailRows
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
              style="margin:18px 0;background:${SIRAJA_COLORS.bgPage};border-radius:12px;
                     overflow:hidden;border:1px solid ${SIRAJA_COLORS.borderLight};">
         ${detailRows}
       </table>`
    : '';

  const warningCard = getCardHtml(
    `🚨 <strong>لم تكن أنت؟</strong> أمّن حسابك فوراً بتغيير كلمة المرور والتواصل مع الدعم على
     <a href="mailto:${supportEmail}" style="color:#DC2626;font-weight:700;">${supportEmail}</a>`,
    'danger'
  );

  const body = `
    ${illustration}

    <!-- Red severity badge -->
    <div style="margin:0 0 16px;">
      <span style="display:inline-block;background:#DC2626;color:#ffffff;
                   font-size:12px;font-weight:700;padding:4px 14px;border-radius:99px;
                   font-family:'Cairo',Tahoma,Arial,sans-serif;letter-spacing:0.3px;">
        ${cfg.icon} تنبيه أمني
      </span>
    </div>

    <h2 style="color:#DC2626;font-size:23px;font-weight:800;margin:0 0 8px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      ${cfg.title}
    </h2>
    <div style="width:52px;height:3px;background:linear-gradient(to left,transparent,#DC262660,#DC2626);
                border-radius:99px;margin:0 0 24px;"></div>

    <p style="margin:0 0 8px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مرحباً <strong style="color:${SIRAJA_COLORS.textPrimary};">${fullName}</strong>،
    </p>
    <p style="margin:0 0 20px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      ${cfg.body}
    </p>

    ${detailsTable}
    ${warningCard}
    ${ctaButton}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:26px 0 18px;"/>

    <p style="font-size:13px;color:${SIRAJA_COLORS.textMuted};margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1.8;">
      للدعم الفوري تواصل معنا على
      <a href="mailto:${supportEmail}" style="color:${primaryColor};font-weight:600;text-decoration:none;">${supportEmail}</a>
    </p>
  `;

  const detailsText = details
    ? Object.entries({ 'الجهاز': details.device, 'الموقع': details.location, 'IP': details.ip, 'الوقت': details.time })
        .filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')
    : '';

  const text = `تنبيه أمني — ${cfg.title}\n\nمرحباً ${fullName}،\n\n${cfg.body}\n\n${detailsText ? detailsText + '\n\n' : ''}إذا لم تكن أنت من قام بذلك، أمّن حسابك فوراً.\n${actionUrl ? `${cfg.defaultAction}: ${actionUrl}\n` : ''}الدعم: ${supportEmail}\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
