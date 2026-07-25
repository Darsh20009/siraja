import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getCardHtml, getEmailIllustration, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export interface InvitationTemplateData extends BaseTemplateData {
  /** Name of the person being invited */
  inviteeName: string;
  /** Name of the person or admin who sent the invitation */
  inviterName: string;
  /** Role being assigned — e.g. "طالب" | "شيخ" | "ولي أمر" */
  role?: string;
  /** URL for the invitee to accept the invitation */
  inviteUrl: string;
  /** Number of days until the invitation expires (default: 7) */
  expiresInDays?: number;
  /** Optional personalised message from the inviter */
  personalMessage?: string;
  /** Display name of the academy / tenant (falls back to tenantName) */
  academyName?: string;
}

export function invitationEmailTemplate(data: InvitationTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    inviteeName,
    inviterName,
    role,
    inviteUrl,
    expiresInDays = 7,
    personalMessage,
    academyName,
    tenantName   = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor  = SIRAJA_BRAND_DEFAULTS.accentColor,
    supportEmail = SIRAJA_BRAND_DEFAULTS.supportEmail,
  } = data;

  const displayAcademy = academyName || tenantName;
  const roleLabel      = role ? ` بصفة <strong style="color:${SIRAJA_COLORS.textPrimary};">${role}</strong>` : '';

  const subject = `🌟 دعوة للانضمام إلى ${displayAcademy}`;

  const illustration = getEmailIllustration('invitation', primaryColor, accentColor);

  const ctaButton = getButtonHtml({
    href:  inviteUrl,
    label: '✅ قبول الدعوة والانضمام',
    primaryColor,
    accentColor,
    width: 260,
  });

  const personalCard = personalMessage
    ? getCardHtml(
        `💬&nbsp; <em>"${personalMessage}"</em><br/>— ${inviterName}`,
        'info',
      )
    : '';

  const expiryCard = getCardHtml(
    `⏱&nbsp; هذه الدعوة صالحة لمدة <strong>${expiresInDays} أيام</strong> من تاريخ إرسالها.`,
    'info',
  );

  const headingRule = `<div style="width:48px;height:3px;background:${accentColor};background:linear-gradient(to left,transparent,${accentColor},${primaryColor});border-radius:2px;margin:0 0 22px;"></div>`;

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:22px;font-weight:700;margin:0 0 6px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      🌟 أنت مدعو للانضمام!
    </h2>
    ${headingRule}

    <p style="margin:0 0 16px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مرحباً <strong style="color:${SIRAJA_COLORS.textPrimary};">${inviteeName}</strong>،
    </p>

    <p style="margin:0 0 16px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      قام <strong style="color:${SIRAJA_COLORS.textPrimary};">${inviterName}</strong> بدعوتك للانضمام إلى
      <strong style="color:${SIRAJA_COLORS.textPrimary};">${displayAcademy}</strong>${roleLabel}
      عبر منصة <strong style="color:${SIRAJA_COLORS.textPrimary};">${tenantName}</strong>.
    </p>

    ${personalCard}

    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr><td align="center" style="padding:24px 0 0;">${ctaButton}</td></tr>
    </table>

    <p style="text-align:center;font-size:12px;color:${SIRAJA_COLORS.textMuted};margin:8px 0 20px;
              word-break:break-all;direction:ltr;font-family:Tahoma,Arial,sans-serif;">
      <a href="${inviteUrl}" style="color:${primaryColor};">${inviteUrl}</a>
    </p>

    ${expiryCard}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:26px 0;"/>

    <p style="font-size:13px;color:${SIRAJA_COLORS.textMuted};margin:0 0 10px;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      إذا لم تتوقع هذه الدعوة أو لا تعرف المُرسِل، يمكنك تجاهل هذه الرسالة بأمان.
    </p>
    <p style="font-size:13px;color:${SIRAJA_COLORS.textMuted};margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      للمساعدة تواصل معنا على
      <a href="mailto:${supportEmail}" style="color:${primaryColor};">${supportEmail}</a>
    </p>
  `;

  const text = `مرحباً ${inviteeName}،\n\nقام ${inviterName} بدعوتك للانضمام إلى ${displayAcademy} عبر منصة ${tenantName}.\n\nلقبول الدعوة:\n${inviteUrl}\n\nصالحة لمدة ${expiresInDays} أيام.\n\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
