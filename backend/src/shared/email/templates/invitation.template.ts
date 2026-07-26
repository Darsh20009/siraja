import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getButtonHtml, getCardHtml, getEmailIllustration, escapeHtml, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export interface InvitationTemplateData extends BaseTemplateData {
  inviteeName: string;
  inviterName: string;
  role?: string;
  inviteUrl: string;
  expiresInDays?: number;
  personalMessage?: string;
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
    expiresInDays    = 7,
    personalMessage,
    academyName,
    tenantName        = SIRAJA_BRAND_DEFAULTS.tenantName,
    primaryColor      = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor       = SIRAJA_BRAND_DEFAULTS.accentColor,
  } = data;

  const displayAcademy = academyName ?? tenantName;

  // ── HTML-safe aliases ──────────────────────────────────────────────────────
  const sInvitee  = escapeHtml(inviteeName);
  const sInviter  = escapeHtml(inviterName);
  const sAcademy  = escapeHtml(displayAcademy);
  const sTenant   = escapeHtml(tenantName);
  const sRole     = role ? escapeHtml(role) : '';
  const sPersonal = personalMessage ? escapeHtml(personalMessage) : '';

  const subject = `🌟 دعوة للانضمام إلى ${displayAcademy}`;

  const illustration = getEmailIllustration('invitation', primaryColor, accentColor);

  const ctaButton = getButtonHtml({
    href:  inviteUrl,
    label: '🌟 قبول الدعوة',
    primaryColor,
    accentColor,
    width: 240,
  });


  const expiryCard = getCardHtml(
    `⏱ تنتهي صلاحية هذه الدعوة خلال <strong>${expiresInDays} أيام</strong>.`,
    'warning'
  );

  const roleChip = role
    ? `<span style="display:inline-block;background:${accentColor}22;color:${accentColor};
                    border:1px solid ${accentColor}44;border-radius:99px;
                    font-size:12px;font-weight:700;padding:3px 12px;margin-right:6px;
                    font-family:'Cairo',Tahoma,Arial,sans-serif;">${sRole}</span>`
    : '';

  const personalCard = personalMessage
    ? getCardHtml(`💬 <em style="font-style:italic;">"${sPersonal}"</em> — <strong>${sInviter}</strong>`, 'info')
    : '';

  const body = `
    ${illustration}

    <h2 style="color:${primaryColor};font-size:23px;font-weight:800;margin:0 0 8px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;">
      أنت مدعو للانضمام! 🎉
    </h2>
    <div class="heading-rule" style="width:52px;height:3px;background:linear-gradient(to left,transparent,${accentColor},${primaryColor});
                border-radius:99px;margin:0 0 24px;"></div>

    <p style="margin:0 0 16px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      مرحباً <strong style="color:${SIRAJA_COLORS.textPrimary};">${sInvitee}</strong>،
    </p>
    <p style="margin:0 0 20px;color:${SIRAJA_COLORS.textSecondary};font-size:15px;line-height:1.9;
              font-family:'Cairo',Tahoma,Arial,sans-serif;">
      يدعوك <strong style="color:${SIRAJA_COLORS.textPrimary};">${sInviter}</strong>
      للانضمام إلى <strong style="color:${SIRAJA_COLORS.textPrimary};">${sAcademy}</strong>
      على منصة ${sTenant}${role ? ` بدور ${roleChip}` : ''}.
    </p>

    ${personalCard}

    ${ctaButton}

    <p class="link-fallback"
       style="text-align:center;font-size:12px;color:${SIRAJA_COLORS.textMuted};
              margin:-8px 0 24px;word-break:break-all;direction:ltr;
              font-family:Tahoma,Arial,sans-serif;">
      <a href="${inviteUrl}" style="color:${primaryColor};text-decoration:underline;">${inviteUrl}</a>
    </p>

    ${expiryCard}

    <hr style="border:none;border-top:1px solid ${SIRAJA_COLORS.borderLight};margin:26px 0 18px;"/>

    <p style="font-size:13px;color:${SIRAJA_COLORS.textMuted};margin:0;
              font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1.8;">
      إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا البريد بأمان.
    </p>
  `;

  const text = `مرحباً ${inviteeName}،\n\nيدعوك ${inviterName} للانضمام إلى ${displayAcademy}.\n\n${personalMessage ? `"${personalMessage}"\n\n` : ''}اقبل الدعوة عبر:\n${inviteUrl}\n\nتنتهي خلال ${expiresInDays} أيام.\nفريق ${tenantName}`;

  return { subject, html: baseEmailTemplate(body, data), text };
}
