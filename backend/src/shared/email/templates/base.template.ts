import {
  SIRAJA_COLORS,
  EMAIL_FONT_STACK,
  GOOGLE_FONTS_LINK,
  SIRAJA_BRAND_DEFAULTS,
  getLogoMarkup,
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
   * Keep under 100 characters. Falls back to a zero-width filler when omitted.
   */
  preheader?: string;
}

// ─── Geometric ornament ───────────────────────────────────────────────────────
// Unicode-based, renders in every email client.
const GEO_ROW = '✦ &nbsp; ◆ &nbsp; ✦ &nbsp; ◆ &nbsp; ✦ &nbsp; ◆ &nbsp; ✦ &nbsp; ◆ &nbsp; ✦ &nbsp; ◆ &nbsp; ✦ &nbsp; ◆ &nbsp; ✦';

// ─── Main template ────────────────────────────────────────────────────────────

/**
 * Siraja branded HTML email shell — "ضوء السراج"
 *
 * Uses TABLE-based layout for maximum cross-client compatibility:
 *   - Outlook 2016-2021 (table cells + VML)
 *   - Gmail (web + Android + iOS)
 *   - Apple Mail (macOS + iOS)
 *   - Outlook.com / Yahoo / Samsung Mail
 *
 * Dark-mode: @media (prefers-color-scheme: dark) + [data-ogsc] Gmail selectors.
 *
 * @param body  - Pre-rendered inner HTML from individual templates
 * @param data  - Brand data (resolved via EmailBrandService or passed directly)
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
  } = data;

  const tagline     = tenantTagline ?? SIRAJA_BRAND_DEFAULTS.tenantTagline;
  const displayName = tenantName;
  const logoHtml    = getLogoMarkup({ logoUrl, tenantName, width: 58, height: 70 });
  const webDomain   = websiteUrl.replace(/^https?:\/\//, '');

  // Header gradient — use spec primary or derive shades from custom primary
  const isSirajaBrand = primaryColor === SIRAJA_BRAND_DEFAULTS.primaryColor;
  const hdrDeep  = isSirajaBrand ? SIRAJA_COLORS.primaryDeep  : primaryColor;
  const hdrLight = isSirajaBrand ? SIRAJA_COLORS.primaryLight : primaryColor;

  // Preheader: visible text or zero-width space filler (to prevent body leaking into preview)
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:${SIRAJA_COLORS.bgPage};line-height:1px;">${preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`
    : `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`;

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
    img { -ms-interpolation-mode: bicubic; border: 0; outline: 0; text-decoration: none; }
    a  { text-decoration: none; }

    /* ═══ BASE ═════════════════════════════════════════════════════════════════ */
    body {
      margin: 0;
      padding: 0;
      background-color: ${SIRAJA_COLORS.bgPage};
      font-family: ${EMAIL_FONT_STACK};
      direction: rtl;
      -webkit-font-smoothing: antialiased;
    }
    .outer-wrapper {
      background-color: ${SIRAJA_COLORS.bgPage};
    }

    /* ═══ BODY CELL ════════════════════════════════════════════════════════════ */
    .email-body {
      padding: 38px 42px 30px !important;
      color: ${SIRAJA_COLORS.textPrimary};
      font-size: 15px;
      line-height: 1.9;
      direction: rtl;
      font-family: ${EMAIL_FONT_STACK};
      background-color: ${SIRAJA_COLORS.bgCard};
    }
    .email-body h2 {
      color: ${primaryColor};
      font-size: 21px;
      font-weight: 700;
      margin: 0 0 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid ${SIRAJA_COLORS.borderLight};
      font-family: ${EMAIL_FONT_STACK};
    }
    .email-body p  { margin: 0 0 16px; color: ${SIRAJA_COLORS.textSecondary}; }
    .email-body strong { color: ${SIRAJA_COLORS.textPrimary}; font-weight: 700; }
    .email-body a  { color: ${primaryColor}; text-decoration: none; }
    .email-body a:hover { text-decoration: underline; }

    /* CTA button wrapper — hides the fallback <a> from MSO */
    .btn-wrap { text-align: center; margin: 28px 0; }

    /* Link fallback below buttons */
    .link-fallback {
      text-align: center;
      font-size: 12px;
      color: ${SIRAJA_COLORS.textMuted};
      margin: -12px 0 20px;
      word-break: break-all;
      direction: ltr;
    }
    .link-fallback a { color: ${primaryColor}; text-decoration: underline; }

    /* Section divider */
    .section-divider {
      border: none;
      border-top: 1px solid ${SIRAJA_COLORS.borderLight};
      margin: 24px 0;
    }

    /* Feature list (welcome email) */
    .feature-list { list-style: none; padding: 0; margin: 16px 0; }
    .feature-list li {
      padding: 9px 4px;
      border-bottom: 1px solid ${SIRAJA_COLORS.borderLight};
      font-size: 14px;
      color: ${SIRAJA_COLORS.textSecondary};
    }
    .feature-list li:last-child { border-bottom: none; }
    .feature-list li::before {
      content: '✦';
      color: ${accentColor};
      margin-left: 10px;
      font-size: 10px;
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
      .email-outer-td { padding: 16px 8px 32px !important; }
      .email-card     { border-radius: 0 !important; }
      .email-body     { padding: 28px 22px 20px !important; }
      .email-body h2  { font-size: 19px !important; }
      .email-footer   { padding: 20px 16px !important; }
    }

    /* ═══ DARK MODE — Apple Mail, iOS Mail, Samsung Mail, Outlook.com ══════════ */
    @media (prefers-color-scheme: dark) {
      body            { background-color: ${SIRAJA_COLORS.darkBgPage}   !important; }
      .outer-wrapper  { background-color: ${SIRAJA_COLORS.darkBgPage}   !important; }
      .email-body     { background-color: ${SIRAJA_COLORS.darkBgCard}   !important;
                        color:            ${SIRAJA_COLORS.darkText}      !important; }
      .email-body p   { color: ${SIRAJA_COLORS.darkTextMuted}            !important; }
      .email-body h2  { color: ${SIRAJA_COLORS.darkHeading}              !important;
                        border-bottom-color: ${SIRAJA_COLORS.darkBorder} !important; }
      .email-body a   { color: ${SIRAJA_COLORS.darkLink}                 !important; }
      .email-body strong { color: #ffffff                                !important; }
      .section-divider{ border-top-color: ${SIRAJA_COLORS.darkBorder}   !important; }
      .email-footer   { background-color: ${SIRAJA_COLORS.darkBgFooter} !important;
                        border-top-color:  ${SIRAJA_COLORS.darkBorder}  !important; }
      .quran-verse    { color: ${SIRAJA_COLORS.darkHeading}              !important; }
      .feature-list li{ color: ${SIRAJA_COLORS.darkTextMuted}            !important;
                        border-bottom-color: ${SIRAJA_COLORS.darkBorder} !important; }
    }

    /* ═══ DARK MODE — Gmail web ([data-ogsc] attribute selector) ════════════════ */
    [data-ogsc] body           { background-color: ${SIRAJA_COLORS.darkBgPage}   !important; }
    [data-ogsc] .outer-wrapper { background-color: ${SIRAJA_COLORS.darkBgPage}   !important; }
    [data-ogsc] .email-body    { background-color: ${SIRAJA_COLORS.darkBgCard}   !important;
                                  color:            ${SIRAJA_COLORS.darkText}     !important; }
    [data-ogsc] .email-body p  { color: ${SIRAJA_COLORS.darkTextMuted}            !important; }
    [data-ogsc] .email-body h2 { color: ${SIRAJA_COLORS.darkHeading}              !important; }
    [data-ogsc] .email-body a  { color: ${SIRAJA_COLORS.darkLink}                 !important; }
    [data-ogsc] .email-footer  { background-color: ${SIRAJA_COLORS.darkBgFooter} !important; }
    [data-ogsc] .quran-verse   { color: ${SIRAJA_COLORS.darkHeading}              !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${SIRAJA_COLORS.bgPage};" bgcolor="${SIRAJA_COLORS.bgPage}">

${preheaderHtml}

<!-- ╔══════════════════════════════════════════════════════════╗
     ║  OUTER WRAPPER TABLE                                     ║
     ╚══════════════════════════════════════════════════════════╝ -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       class="outer-wrapper" bgcolor="${SIRAJA_COLORS.bgPage}"
       style="background-color:${SIRAJA_COLORS.bgPage};">
  <tr>
    <td align="center" valign="top" class="email-outer-td"
        style="padding:32px 16px 48px;">

      <!--[if mso]><table align="center" border="0" cellspacing="0" cellpadding="0" width="600"><tr><td align="center" valign="top" width="600"><![endif]-->

      <!-- ╔══════════════════════════════════════════════════════╗
           ║  EMAIL CARD                                          ║
           ╚══════════════════════════════════════════════════════╝ -->
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%"
             class="email-card"
             style="max-width:600px;background-color:${SIRAJA_COLORS.bgCard};border-radius:12px;
                    overflow:hidden;box-shadow:0 4px 28px rgba(26,107,74,0.10);">

        <!-- ── Gold accent top strip ─────────────────────────────── -->
        <tr>
          <td height="5" bgcolor="${accentColor}"
              style="height:5px;line-height:5px;font-size:0;background-color:${accentColor};">&nbsp;</td>
        </tr>

        <!-- ── Header ───────────────────────────────────────────── -->
        <tr>
          <td align="center" valign="top" bgcolor="${hdrDeep}"
              style="background-color:${hdrDeep};
                     background:linear-gradient(160deg,${hdrDeep} 0%,${primaryColor} 55%,${hdrLight} 100%);
                     padding:0;text-align:center;">

            <!-- Geometric ornament -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center"
                    style="padding:22px 20px 0;color:rgba(201,168,76,0.40);font-size:9px;
                           letter-spacing:4px;font-family:Arial,sans-serif;
                           overflow:hidden;white-space:nowrap;line-height:1.2;">
                  ${GEO_ROW}
                </td>
              </tr>
            </table>

            <!-- Logo -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding:16px 24px 4px;">
                  ${logoHtml}
                </td>
              </tr>
            </table>

            <!-- Brand name -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding:2px 24px 4px;">
                  <h1 style="margin:0;color:#ffffff;font-size:36px;font-weight:800;
                             letter-spacing:1px;line-height:1.2;
                             text-shadow:0 2px 10px rgba(0,0,0,0.28);
                             font-family:'Cairo',Tahoma,Arial,sans-serif;">${displayName}</h1>
                </td>
              </tr>
            </table>

            <!-- Tagline -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding:4px 24px 14px;">
                  <p style="margin:0;color:${accentColor};font-size:12.5px;font-weight:500;
                            font-family:'Cairo',Tahoma,Arial,sans-serif;opacity:0.95;">${tagline}</p>
                </td>
              </tr>
            </table>

            <!-- Gold divider (Outlook: solid gold cell; others: gradient) -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding:0 0 18px;">
                  <!--[if mso]><table align="center" border="0" cellpadding="0" cellspacing="0" width="64"><tr><td height="2" bgcolor="${accentColor}" style="height:2px;line-height:2px;font-size:0;">&nbsp;</td></tr></table><![endif]-->
                  <!--[if !mso]><!-->
                  <div style="width:64px;height:2px;background:linear-gradient(90deg,transparent,${accentColor},transparent);margin:0 auto;mso-hide:all;"></div>
                  <!--<![endif]-->
                </td>
              </tr>
            </table>

            <!-- Bottom shimmer line (decorative) -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td height="1" bgcolor="${primaryColor}"
                    style="height:1px;line-height:1px;font-size:0;
                           background:linear-gradient(90deg,transparent,rgba(201,168,76,0.45),transparent);">&nbsp;</td>
              </tr>
            </table>

          </td>
        </tr>
        <!-- ── /Header ─────────────────────────────────────────── -->

        <!-- ── Body ─────────────────────────────────────────────── -->
        <tr>
          <td class="email-body"
              bgcolor="${SIRAJA_COLORS.bgCard}"
              style="padding:38px 42px 30px;color:${SIRAJA_COLORS.textPrimary};font-size:15px;
                     line-height:1.9;direction:rtl;font-family:${EMAIL_FONT_STACK};
                     background-color:${SIRAJA_COLORS.bgCard};">
            ${body}
          </td>
        </tr>
        <!-- ── /Body ─────────────────────────────────────────────── -->

        <!-- ── Footer ───────────────────────────────────────────── -->
        <tr>
          <td class="email-footer" bgcolor="${SIRAJA_COLORS.bgFooter}" align="center"
              style="background-color:${SIRAJA_COLORS.bgFooter};border-top:1px solid ${SIRAJA_COLORS.border};
                     padding:28px 32px 24px;text-align:center;direction:rtl;">

            <!-- Quranic verse -->
            <p class="quran-verse"
               style="margin:0 0 3px;color:${primaryColor};font-size:16px;font-weight:700;
                      font-family:'Cairo',Tahoma,Arial,sans-serif;">﴿ نُورٌ عَلَىٰ نُورٍ ﴾</p>
            <p class="quran-source"
               style="margin:0 0 18px;color:${accentColor};font-size:11px;
                      font-family:'Cairo',Tahoma,Arial,sans-serif;">سورة النور — آية ٣٥</p>

            <!-- Gold ornamental divider -->
            <!--[if mso]><table align="center" border="0" cellpadding="0" cellspacing="0" width="44"><tr><td height="1" bgcolor="${accentColor}" style="height:1px;line-height:1px;font-size:0;opacity:0.5;">&nbsp;</td></tr></table><![endif]-->
            <!--[if !mso]><!-->
            <div style="width:44px;height:1px;background-color:${accentColor};opacity:0.5;margin:0 auto 18px;mso-hide:all;"></div>
            <!--<![endif]-->

            <!-- Social / contact bar -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding:0 0 14px;">
                  <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer"
                     style="color:${primaryColor};font-size:12.5px;font-weight:600;
                            font-family:'Cairo',Tahoma,Arial,sans-serif;text-decoration:none;
                            margin:0 10px;white-space:nowrap;">🌐&nbsp; ${webDomain}</a>
                  <a href="mailto:${supportEmail}"
                     style="color:${primaryColor};font-size:12.5px;font-weight:600;
                            font-family:'Cairo',Tahoma,Arial,sans-serif;text-decoration:none;
                            margin:0 10px;white-space:nowrap;">✉&nbsp; ${supportEmail}</a>
                </td>
              </tr>
            </table>

            <!-- Secondary links -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding:0 0 10px;">
                  <a href="${websiteUrl}/privacy"
                     style="color:${SIRAJA_COLORS.textMuted};font-size:11px;
                            font-family:Tahoma,Arial,sans-serif;text-decoration:none;margin:0 5px;">سياسة الخصوصية</a>
                  <span style="color:${SIRAJA_COLORS.textMuted};font-size:11px;margin:0 2px;">·</span>
                  <a href="${websiteUrl}/terms"
                     style="color:${SIRAJA_COLORS.textMuted};font-size:11px;
                            font-family:Tahoma,Arial,sans-serif;text-decoration:none;margin:0 5px;">شروط الاستخدام</a>
                  <span style="color:${SIRAJA_COLORS.textMuted};font-size:11px;margin:0 2px;">·</span>
                  <a href="${websiteUrl}/unsubscribe"
                     style="color:${SIRAJA_COLORS.textMuted};font-size:11px;
                            font-family:Tahoma,Arial,sans-serif;text-decoration:none;margin:0 5px;">إلغاء الاشتراك</a>
                </td>
              </tr>
            </table>

            <!-- Copyright -->
            <p style="margin:0;color:${SIRAJA_COLORS.textMuted};font-size:11px;
                      font-family:Tahoma,Arial,sans-serif;line-height:1.8;">
              © ${year} منصة ${tenantName} · جميع الحقوق محفوظة
            </p>

          </td>
        </tr>
        <!-- ── /Footer ─────────────────────────────────────────── -->

      </table>
      <!-- ╚══════════════════════════════════════════════════════╝ -->

      <!--[if mso]></td></tr></table><![endif]-->

    </td>
  </tr>
</table>
<!-- ╚══════════════════════════════════════════════════════════╝ -->

</body>
</html>`;
}
