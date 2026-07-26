import {
  SIRAJA_COLORS,
  EMAIL_FONT_STACK,
  GOOGLE_FONTS_LINK,
  SIRAJA_BRAND_DEFAULTS,
  getLogoMarkup,
  getGeoPatternBand,
  getSocialLinksHtml,
  SocialLink,
} from '../brand/brand-config';

// ─── Data contract ────────────────────────────────────────────────────────────

export interface BaseTemplateData {
  /** Tenant or platform name shown in the header */
  tenantName?: string;
  /** Optional tagline; Siraja default used when absent */
  tenantTagline?: string;
  /**
   * Publicly accessible HTTPS logo URL (Cloudflare R2 / CDN).
   * Absent → official Siraja inline SVG lantern (zero external deps).
   */
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  year?: number;
  supportEmail?: string;
  websiteUrl?: string;
  /**
   * Optional hidden preheader text — shown in inbox previews before the subject.
   * Keep under 100 characters.
   */
  preheader?: string;
  /** Optional social / quick-link row in the footer */
  socialLinks?: SocialLink[];
  /** Optional custom text shown below the copyright line in the footer */
  footerText?: string;
}

// ─── Main template ────────────────────────────────────────────────────────────

/**
 * Siraja Premium Email Shell — "ضوء السراج"
 *
 * Premium redesign: world-class typography, Islamic geometric art,
 * soft radial lighting, pill-gradient buttons, 16px-radius cards,
 * comprehensive dark mode, and silky entrance animation.
 *
 * Cross-client compatibility:
 *   - Outlook 2016-2021: TABLE-based layout + VML buttons
 *   - Gmail (web + Android + iOS): [data-ogsc] dark mode
 *   - Apple Mail + iOS Mail: @media dark mode + CSS animations
 *   - Yahoo / Samsung / ProtonMail / Fastmail / Thunderbird
 */
export function baseEmailTemplate(body: string, data: BaseTemplateData = {}): string {
  const {
    tenantName    = SIRAJA_BRAND_DEFAULTS.tenantName,
    tenantTagline,
    logoUrl,
    primaryColor  = SIRAJA_BRAND_DEFAULTS.primaryColor,
    accentColor   = SIRAJA_BRAND_DEFAULTS.accentColor,
    year          = new Date().getFullYear(),
    supportEmail  = SIRAJA_BRAND_DEFAULTS.supportEmail,
    websiteUrl    = SIRAJA_BRAND_DEFAULTS.websiteUrl,
    preheader,
    socialLinks   = [],
    footerText,
  } = data;

  const tagline     = tenantTagline ?? SIRAJA_BRAND_DEFAULTS.tenantTagline;
  const logoHtml    = getLogoMarkup({ logoUrl, tenantName, width: 58, height: 72 });
  const webDomain   = websiteUrl.replace(/^https?:\/\//, '');

  // Header gradient shades
  const isSirajaBrand = primaryColor === SIRAJA_BRAND_DEFAULTS.primaryColor;
  const hdrDeep  = isSirajaBrand ? SIRAJA_COLORS.primaryDeep  : primaryColor;
  const hdrLight = isSirajaBrand ? SIRAJA_COLORS.primaryLight : primaryColor;
  const hdrMid   = isSirajaBrand ? SIRAJA_COLORS.primaryMid   : primaryColor;

  // Preheader
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:${SIRAJA_COLORS.bgPage};line-height:1px;">${preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`
    : `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`;

  const socialLinksHtml = getSocialLinksHtml(socialLinks, primaryColor);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl" xmlns="http://www.w3.org/1999/xhtml"
      xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no"/>
  <meta name="color-scheme" content="light dark"/>
  <meta name="supported-color-schemes" content="light dark"/>
  <title>${tenantName}</title>
  <!--[if mso]>
  <noscript><xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
      <o:AllowPNG/>
    </o:OfficeDocumentSettings>
  </xml></noscript>
  <![endif]-->
  ${GOOGLE_FONTS_LINK}
  <style type="text/css">
    /* ═══ RESET ═══════════════════════════════════════════════════════════════ */
    * { box-sizing: border-box; }
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: 0; text-decoration: none; display: block; }
    a  { text-decoration: none; }

    /* ═══ BASE ═════════════════════════════════════════════════════════════════ */
    body {
      margin: 0; padding: 0;
      background-color: ${SIRAJA_COLORS.bgPage};
      font-family: ${EMAIL_FONT_STACK};
      direction: rtl;
      -webkit-font-smoothing: antialiased;
    }
    .outer-wrapper { background-color: ${SIRAJA_COLORS.bgPage}; }

    /* ═══ ANIMATIONS ════════════════════════════════════════════════════════════ */
    /* Apple Mail, iOS Mail, Samsung Mail — others ignore gracefully             */
    @keyframes siraja-emerge {
      from { opacity: 0; transform: translateY(18px) scale(0.99); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    @keyframes siraja-glow {
      0%, 100% { box-shadow: 0 4px 20px rgba(26,107,74,0.32), 0 1px 4px rgba(0,0,0,0.10); }
      50%       { box-shadow: 0 6px 28px rgba(26,107,74,0.50), 0 2px 8px rgba(0,0,0,0.14); }
    }
    .email-card {
      animation: siraja-emerge 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .btn-primary:hover {
      opacity: 0.92;
      transform: translateY(-2px);
    }
    .btn-primary:focus {
      outline: 3px solid ${accentColor};
      outline-offset: 2px;
    }

    /* ═══ BODY CELL ════════════════════════════════════════════════════════════ */
    .email-body {
      padding: 44px 48px 36px !important;
      color: ${SIRAJA_COLORS.textPrimary};
      font-size: 15px;
      line-height: 1.9;
      direction: rtl;
      font-family: ${EMAIL_FONT_STACK};
      background-color: ${SIRAJA_COLORS.bgCard};
    }
    .email-body h2 {
      color: ${primaryColor};
      font-size: 23px;
      font-weight: 800;
      margin: 0 0 8px;
      font-family: ${EMAIL_FONT_STACK};
      letter-spacing: -0.2px;
      line-height: 1.35;
    }
    .heading-rule {
      width: 52px; height: 3px;
      background: linear-gradient(to left, transparent, ${accentColor}, ${primaryColor});
      border-radius: 99px;
      margin: 0 0 24px;
    }
    .email-body p  { margin: 0 0 16px; color: ${SIRAJA_COLORS.textSecondary}; }
    .email-body strong { color: ${SIRAJA_COLORS.textPrimary}; font-weight: 700; }
    .email-body a  { color: ${primaryColor}; text-decoration: none; font-weight: 600; }
    .email-body a:hover { text-decoration: underline; }

    /* Link fallback below buttons */
    .link-fallback {
      text-align: center;
      font-size: 12px;
      color: ${SIRAJA_COLORS.textMuted};
      margin: -12px 0 22px;
      word-break: break-all;
      direction: ltr;
    }
    .link-fallback a { color: ${primaryColor}; text-decoration: underline; }

    /* Section divider */
    .section-divider {
      border: none;
      border-top: 1px solid ${SIRAJA_COLORS.borderLight};
      margin: 28px 0;
    }

    /* Premium inner card — 16px radius, soft shadow */
    .inner-card {
      background: ${SIRAJA_COLORS.bgPage};
      border: 1px solid ${SIRAJA_COLORS.borderLight};
      border-radius: 16px;
      padding: 22px 26px;
      margin: 20px 0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.04);
    }

    /* Feature list (welcome email) */
    .feature-list { list-style: none; padding: 0; margin: 16px 0 24px; }
    .feature-list li {
      padding: 11px 14px;
      border-bottom: 1px solid ${SIRAJA_COLORS.borderLight};
      font-size: 14px;
      color: ${SIRAJA_COLORS.textSecondary};
      display: flex;
      align-items: center;
      border-radius: 8px;
      transition: background 0.15s ease;
    }
    .feature-list li:last-child { border-bottom: none; }

    /* Stat grid */
    .stat-label {
      font-size: 11px;
      color: ${SIRAJA_COLORS.textMuted};
      font-family: ${EMAIL_FONT_STACK};
      margin: 0 0 4px;
      font-weight: 500;
      letter-spacing: 0.3px;
    }
    .stat-value {
      font-size: 26px;
      font-weight: 900;
      color: ${primaryColor};
      font-family: ${EMAIL_FONT_STACK};
      margin: 0;
      line-height: 1;
    }

    /* ═══ FOOTER ═══════════════════════════════════════════════════════════════ */
    .email-footer {
      background-color: ${SIRAJA_COLORS.bgFooter} !important;
      border-top: 1px solid ${SIRAJA_COLORS.border};
    }
    .quran-verse  { color: ${primaryColor} !important; }
    .quran-source { color: ${accentColor}  !important; }

    /* ═══ MOBILE ════════════════════════════════════════════════════════════════ */
    @media only screen and (max-width: 620px) {
      .email-outer-td { padding: 12px 4px 28px !important; }
      .email-card     { border-radius: 0 !important; }
      .email-body     { padding: 28px 20px 20px !important; }
      .email-body h2  { font-size: 20px !important; }
      .email-footer   { padding: 22px 16px !important; }
      .stat-value     { font-size: 22px !important; }
      .inner-card     { padding: 16px 18px !important; border-radius: 12px !important; }
    }

    /* ═══ DARK MODE — Apple Mail, iOS, Samsung, Outlook.com ════════════════════ */
    @media (prefers-color-scheme: dark) {
      body            { background-color: ${SIRAJA_COLORS.darkBgPage}   !important; }
      .outer-wrapper  { background-color: ${SIRAJA_COLORS.darkBgPage}   !important; }
      .email-card     { box-shadow: 0 8px 40px rgba(0,0,0,0.60) !important; }
      .email-body     { background-color: ${SIRAJA_COLORS.darkBgCard}   !important;
                        color:            ${SIRAJA_COLORS.darkText}      !important; }
      .email-body p   { color: ${SIRAJA_COLORS.darkTextMuted}            !important; }
      .email-body h2  { color: ${SIRAJA_COLORS.darkHeading}              !important; }
      .email-body a   { color: ${SIRAJA_COLORS.darkLink}                 !important; }
      .email-body strong { color: #ffffff                                !important; }
      .section-divider{ border-top-color: ${SIRAJA_COLORS.darkBorder}   !important; }
      .inner-card     { background-color: ${SIRAJA_COLORS.darkBgInfoCard}!important;
                        border-color:     ${SIRAJA_COLORS.darkBorder}   !important;
                        box-shadow: none !important; }
      .email-footer   { background-color: ${SIRAJA_COLORS.darkBgFooter} !important;
                        border-top-color: ${SIRAJA_COLORS.darkBorder}   !important; }
      .quran-verse    { color: ${SIRAJA_COLORS.darkHeading}              !important; }
      .quran-source   { color: ${SIRAJA_COLORS.accent}                   !important; }
      .feature-list li{ color: ${SIRAJA_COLORS.darkTextMuted}            !important;
                        border-bottom-color: ${SIRAJA_COLORS.darkBorder} !important; }
      .stat-label     { color: ${SIRAJA_COLORS.darkTextMuted}            !important; }
      .stat-value     { color: ${SIRAJA_COLORS.darkHeading}              !important; }
      .link-fallback  { color: ${SIRAJA_COLORS.darkTextMuted}            !important; }
      .heading-rule   { opacity: 0.70 !important; }
      /* ── Accent cards ── */
      .card-bg-info    { background-color: ${SIRAJA_COLORS.darkBgInfoCard} !important; color: ${SIRAJA_COLORS.darkText}    !important; }
      .card-bg-success { background-color: #0d2418                         !important; color: #bbf7d0                      !important; }
      .card-bg-warning { background-color: ${SIRAJA_COLORS.darkBgWarnCard} !important; color: #FDE68A                     !important; }
      .card-bg-danger  { background-color: ${SIRAJA_COLORS.darkBgDanger}   !important; color: #FCA5A5                     !important; }
      /* ── Code box (OTP / verification) ── */
      .code-box-value  { color: ${SIRAJA_COLORS.darkHeading}              !important; }
    }

    /* ═══ DARK MODE — Gmail web / Outlook.com ([data-ogsc]) ══════════════════════ */
    [data-ogsc] body            { background-color: ${SIRAJA_COLORS.darkBgPage}   !important; }
    [data-ogsc] .outer-wrapper  { background-color: ${SIRAJA_COLORS.darkBgPage}   !important; }
    [data-ogsc] .email-body     { background-color: ${SIRAJA_COLORS.darkBgCard}   !important;
                                   color:            ${SIRAJA_COLORS.darkText}     !important; }
    [data-ogsc] .email-body p   { color: ${SIRAJA_COLORS.darkTextMuted}            !important; }
    [data-ogsc] .email-body h2  { color: ${SIRAJA_COLORS.darkHeading}              !important; }
    [data-ogsc] .email-body a   { color: ${SIRAJA_COLORS.darkLink}                 !important; }
    [data-ogsc] .email-body strong { color: #ffffff                                !important; }
    [data-ogsc] .inner-card     { background-color: ${SIRAJA_COLORS.darkBgInfoCard}!important;
                                   border-color:     ${SIRAJA_COLORS.darkBorder}  !important; }
    [data-ogsc] .email-footer   { background-color: ${SIRAJA_COLORS.darkBgFooter} !important;
                                   border-top-color: ${SIRAJA_COLORS.darkBorder}  !important; }
    [data-ogsc] .quran-verse    { color: ${SIRAJA_COLORS.darkHeading}              !important; }
    [data-ogsc] .stat-value     { color: ${SIRAJA_COLORS.darkHeading}              !important; }
    [data-ogsc] .stat-label     { color: ${SIRAJA_COLORS.darkTextMuted}            !important; }
    [data-ogsc] .feature-list li{ color: ${SIRAJA_COLORS.darkTextMuted}            !important; }
    [data-ogsc] .card-bg-info    { background-color: ${SIRAJA_COLORS.darkBgInfoCard} !important; color: ${SIRAJA_COLORS.darkText}  !important; }
    [data-ogsc] .card-bg-success { background-color: #0d2418                         !important; color: #bbf7d0                    !important; }
    [data-ogsc] .card-bg-warning { background-color: ${SIRAJA_COLORS.darkBgWarnCard} !important; color: #FDE68A                   !important; }
    [data-ogsc] .card-bg-danger  { background-color: ${SIRAJA_COLORS.darkBgDanger}   !important; color: #FCA5A5                   !important; }
    [data-ogsc] .code-box-value  { color: ${SIRAJA_COLORS.darkHeading}               !important; }

    /* ═══ CODE BOX — mobile ═════════════════════════════════════════════════════ */
    @media only screen and (max-width: 620px) {
      .code-box-value { font-size: 26px !important; letter-spacing: 10px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${SIRAJA_COLORS.bgPage};" bgcolor="${SIRAJA_COLORS.bgPage}">

${preheaderHtml}

<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       class="outer-wrapper" bgcolor="${SIRAJA_COLORS.bgPage}"
       style="background-color:${SIRAJA_COLORS.bgPage};">
  <tr>
    <td align="center" valign="top" class="email-outer-td"
        style="padding:36px 16px 52px;">

      <!--[if mso]><table align="center" border="0" cellspacing="0" cellpadding="0" width="600"><tr><td align="center" valign="top" width="600"><![endif]-->

      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%"
             class="email-card"
             style="max-width:600px;background-color:${SIRAJA_COLORS.bgCard};border-radius:20px;
                    overflow:hidden;box-shadow:0 8px 40px rgba(26,107,74,0.14),0 2px 10px rgba(0,0,0,0.07);">

        <!-- ── Gold top accent bar ──────────────────────────────────────────── -->
        <tr>
          <td height="4" bgcolor="${accentColor}" style="height:4px;line-height:4px;font-size:0;
                                background:linear-gradient(90deg,${accentColor},${SIRAJA_COLORS.accentLight},${accentColor});">&nbsp;</td>
        </tr>

        <!-- ── Premium Header ──────────────────────────────────────────────── -->
        <tr>
          <td align="center" valign="top"
              style="background-color:${hdrDeep};
                     background:radial-gradient(ellipse at 50% 0%,${hdrLight}55 0%,${hdrMid} 40%,${hdrDeep} 100%),
                                linear-gradient(170deg,${hdrDeep} 0%,${hdrMid} 55%,${primaryColor} 100%);
                     padding:0;text-align:center;">

            <!-- Islamic geometric ornament band -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td style="padding:20px 0 0;font-size:0;line-height:0;">
                  ${getGeoPatternBand()}
                </td>
              </tr>
            </table>

            <!-- Logo — frosted glass circle -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding:16px 24px 8px;">
                  <!--[if !mso]><!-->
                  <div style="display:inline-block;
                              background:rgba(255,255,255,0.08);
                              border:1.5px solid rgba(201,168,76,0.40);
                              border-radius:50%;
                              padding:20px;
                              mso-hide:all;
                              box-shadow:0 0 52px rgba(201,168,76,0.20),0 8px 28px rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.12);">
                    ${logoHtml}
                  </div>
                  <!--<![endif]-->
                  <!--[if mso]>${logoHtml}<![endif]-->
                </td>
              </tr>
            </table>

            <!-- Brand name -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding:4px 32px 2px;">
                  <h1 style="margin:0;color:#ffffff;font-size:38px;font-weight:900;
                             letter-spacing:0.5px;line-height:1.2;
                             text-shadow:0 2px 16px rgba(0,0,0,0.35),0 0 40px rgba(201,168,76,0.15);
                             font-family:'Cairo',Tahoma,Arial,sans-serif;">${tenantName}</h1>
                </td>
              </tr>
            </table>

            <!-- Tagline -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding:6px 32px 16px;">
                  <p style="margin:0;color:${accentColor};font-size:13px;font-weight:500;
                            font-family:'Cairo',Tahoma,Arial,sans-serif;opacity:0.92;
                            letter-spacing:0.3px;">${tagline}</p>
                </td>
              </tr>
            </table>

            <!-- Decorative gold divider -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding:0 0 22px;">
                  <!--[if mso]><table align="center" border="0" cellpadding="0" cellspacing="0" width="80"><tr><td height="2" bgcolor="${accentColor}" style="height:2px;line-height:2px;font-size:0;">&nbsp;</td></tr></table><![endif]-->
                  <!--[if !mso]><!-->
                  <div style="display:flex;align-items:center;justify-content:center;gap:8px;mso-hide:all;">
                    <div style="width:32px;height:1px;background:linear-gradient(to right,transparent,${accentColor}80);"></div>
                    <div style="width:8px;height:8px;background:${accentColor};transform:rotate(45deg);border-radius:1px;"></div>
                    <div style="width:48px;height:2px;background:${accentColor};border-radius:99px;"></div>
                    <div style="width:8px;height:8px;background:${accentColor};transform:rotate(45deg);border-radius:1px;"></div>
                    <div style="width:32px;height:1px;background:linear-gradient(to left,transparent,${accentColor}80);"></div>
                  </div>
                  <!--<![endif]-->
                  <!--[if mso]><table align="center" border="0" cellpadding="0" cellspacing="0" width="80"><tr><td height="2" bgcolor="${accentColor}" style="height:2px;line-height:2px;font-size:0;">&nbsp;</td></tr></table><![endif]-->
                </td>
              </tr>
            </table>

            <!-- Shimmer border -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td height="1" style="height:1px;line-height:1px;font-size:0;
                                       background:linear-gradient(90deg,transparent,rgba(201,168,76,0.40),rgba(255,255,255,0.12),rgba(201,168,76,0.40),transparent);">&nbsp;</td>
              </tr>
            </table>

          </td>
        </tr>
        <!-- ── /Header ─────────────────────────────────────────────────────── -->

        <!-- ── Body ──────────────────────────────────────────────────────────── -->
        <tr>
          <td class="email-body"
              bgcolor="${SIRAJA_COLORS.bgCard}"
              style="padding:44px 48px 36px;color:${SIRAJA_COLORS.textPrimary};font-size:15px;
                     line-height:1.9;direction:rtl;font-family:${EMAIL_FONT_STACK};
                     background-color:${SIRAJA_COLORS.bgCard};">
            ${body}
          </td>
        </tr>
        <!-- ── /Body ──────────────────────────────────────────────────────────── -->

        <!-- ── Premium Footer ─────────────────────────────────────────────────── -->
        <tr>
          <td class="email-footer" bgcolor="${SIRAJA_COLORS.bgFooter}" align="center"
              style="background-color:${SIRAJA_COLORS.bgFooter};border-top:1px solid ${SIRAJA_COLORS.border};
                     padding:32px 36px 28px;text-align:center;direction:rtl;">

            <!-- Ornamental footer divider -->
            <!--[if !mso]><!-->
            <div style="margin:0 auto 22px;mso-hide:all;display:flex;align-items:center;justify-content:center;gap:6px;">
              <div style="width:24px;height:1px;background:linear-gradient(to right,transparent,${accentColor}60);"></div>
              <div style="width:5px;height:5px;background:${accentColor};transform:rotate(45deg);border-radius:1px;opacity:0.70;"></div>
              <div style="width:36px;height:1px;background:${accentColor};opacity:0.45;border-radius:99px;"></div>
              <div style="width:5px;height:5px;background:${accentColor};transform:rotate(45deg);border-radius:1px;opacity:0.70;"></div>
              <div style="width:24px;height:1px;background:linear-gradient(to left,transparent,${accentColor}60);"></div>
            </div>
            <!--<![endif]-->

            <!-- Quranic verse -->
            <p class="quran-verse"
               style="margin:0 0 2px;color:${primaryColor};font-size:19px;font-weight:800;
                      font-family:'Cairo',Tahoma,Arial,sans-serif;letter-spacing:0.5px;">
              ﴿ نُورٌ عَلَىٰ نُورٍ ﴾
            </p>
            <p class="quran-source"
               style="margin:0 0 24px;color:${accentColor};font-size:11.5px;font-weight:500;
                      font-family:'Cairo',Tahoma,Arial,sans-serif;letter-spacing:0.3px;">
              سورة النور — الآية ٣٥
            </p>

            <!-- Social links (tenant custom) -->
            ${socialLinksHtml}

            <!-- Website & support row -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding:0 0 14px;">
                  <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer"
                     style="display:inline-block;color:${primaryColor};font-size:12.5px;font-weight:700;
                            font-family:'Cairo',Tahoma,Arial,sans-serif;text-decoration:none;
                            margin:0 12px;white-space:nowrap;">🌐&nbsp; ${webDomain}</a>
                  <a href="mailto:${supportEmail}"
                     style="display:inline-block;color:${primaryColor};font-size:12.5px;font-weight:700;
                            font-family:'Cairo',Tahoma,Arial,sans-serif;text-decoration:none;
                            margin:0 12px;white-space:nowrap;">✉&nbsp; ${supportEmail}</a>
                </td>
              </tr>
            </table>

            <!-- Policy links -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding:0 0 14px;">
                  <a href="${websiteUrl}/privacy"
                     style="color:${SIRAJA_COLORS.textMuted};font-size:11px;
                            font-family:Tahoma,Arial,sans-serif;text-decoration:none;margin:0 6px;">سياسة الخصوصية</a>
                  <span style="color:${SIRAJA_COLORS.borderLight};font-size:11px;margin:0 2px;">·</span>
                  <a href="${websiteUrl}/terms"
                     style="color:${SIRAJA_COLORS.textMuted};font-size:11px;
                            font-family:Tahoma,Arial,sans-serif;text-decoration:none;margin:0 6px;">شروط الاستخدام</a>
                  <span style="color:${SIRAJA_COLORS.borderLight};font-size:11px;margin:0 2px;">·</span>
                  <a href="${websiteUrl}/unsubscribe"
                     style="color:${SIRAJA_COLORS.textMuted};font-size:11px;
                            font-family:Tahoma,Arial,sans-serif;text-decoration:none;margin:0 6px;">إلغاء الاشتراك</a>
                </td>
              </tr>
            </table>

            <!-- Copyright -->
            <p style="margin:0;color:${SIRAJA_COLORS.textMuted};font-size:11px;
                      font-family:Tahoma,Arial,sans-serif;line-height:1.9;">
              © ${year} منصة ${tenantName} · جميع الحقوق محفوظة${footerText ? `<br/><span style="font-size:10.5px;opacity:0.80;">${footerText}</span>` : ''}
            </p>

          </td>
        </tr>
        <!-- ── /Footer ─────────────────────────────────────────────────────── -->

      </table>

      <!--[if mso]></td></tr></table><![endif]-->

    </td>
  </tr>
</table>

</body>
</html>`;
}
