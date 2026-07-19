export interface BaseTemplateData {
  tenantName?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  year?: number;
  supportEmail?: string;
  websiteUrl?: string;
}

/** Inline SVG lantern logo — works in all email clients without external hosting */
const LANTERN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="52" height="52" style="display:block;margin:0 auto 6px;">
  <!-- Handle -->
  <path d="M34 18 Q34 10 40 10 Q46 10 46 18 L46 22 L34 22 Z" fill="#C9A84C"/>
  <!-- Top cap -->
  <path d="M28 22 L52 22 L56 30 L24 30 Z" fill="#C9A84C"/>
  <!-- Body frame -->
  <rect x="24" y="30" width="32" height="28" rx="2" fill="none" stroke="#C9A84C" stroke-width="2"/>
  <!-- Glass panes dividers -->
  <line x1="40" y1="30" x2="40" y2="58" stroke="#C9A84C" stroke-width="1" opacity="0.5"/>
  <line x1="24" y1="44" x2="56" y2="44" stroke="#C9A84C" stroke-width="1" opacity="0.5"/>
  <!-- Warm light glow -->
  <ellipse cx="40" cy="44" rx="10" ry="12" fill="#FCD34D" opacity="0.30"/>
  <!-- Bottom cap -->
  <path d="M24 58 L56 58 L52 67 L28 67 Z" fill="#C9A84C"/>
  <!-- Bottom finial -->
  <path d="M37 67 L43 67 L41 74 L39 74 Z" fill="#C9A84C"/>
  <!-- Side decorative dots -->
  <circle cx="18" cy="44" r="2.5" fill="#C9A84C" opacity="0.6"/>
  <circle cx="62" cy="44" r="2.5" fill="#C9A84C" opacity="0.6"/>
</svg>`;

/**
 * Branded HTML email shell for Siraja.
 *
 * Design concept: "ضوء السراج" — the warm glow of a lantern illuminating
 * the path of Quran memorisation. Deep emerald primary with gold accents.
 *
 * - Full Arabic RTL layout
 * - Inline SVG lantern logo (no external image dependency)
 * - Responsive: collapses cleanly on mobile
 * - Compatible with Gmail, Outlook, Apple Mail, Yahoo
 */
export function baseEmailTemplate(body: string, data: BaseTemplateData = {}): string {
  const {
    tenantName   = 'سراج',
    primaryColor = '#1A6B4A',
    accentColor  = '#C9A84C',
    year         = new Date().getFullYear(),
    supportEmail = 'support@siraja.website',
    websiteUrl   = 'https://siraja.website',
  } = data;

  // Geometric border pattern row (Unicode-based, renders everywhere)
  const geometricRow = Array(20).fill('◆').join(' ');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${tenantName}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset */
    * { box-sizing: border-box; }
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; }

    /* Base */
    body {
      margin: 0; padding: 0;
      background-color: #EFF5F1;
      font-family: 'Segoe UI', Tahoma, 'Arial Unicode MS', Arial, sans-serif;
      direction: rtl;
    }

    /* Wrapper */
    .email-wrapper {
      width: 100%;
      background-color: #EFF5F1;
      padding: 32px 0 48px;
    }

    /* Container */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(26, 107, 74, 0.10);
    }

    /* ── HEADER ── */
    .email-header {
      background: linear-gradient(160deg, #0d4a32 0%, ${primaryColor} 55%, #22896a 100%);
      padding: 0;
      text-align: center;
    }

    /* Gold geometric top strip */
    .geo-strip-top {
      background-color: ${accentColor};
      height: 5px;
    }

    .header-inner {
      padding: 32px 24px 28px;
    }

    .geo-pattern {
      color: rgba(201, 168, 76, 0.35);
      font-size: 9px;
      letter-spacing: 4px;
      margin: 0 0 18px;
      overflow: hidden;
      white-space: nowrap;
    }

    .brand-name {
      color: #ffffff;
      font-size: 36px;
      font-weight: 800;
      margin: 8px 0 4px;
      letter-spacing: 1px;
      text-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .brand-tagline {
      color: ${accentColor};
      font-size: 13px;
      font-weight: 500;
      margin: 0 0 16px;
      letter-spacing: 0.5px;
      opacity: 0.95;
    }

    /* Gold divider */
    .gold-divider {
      width: 60px;
      height: 2px;
      background: linear-gradient(90deg, transparent, ${accentColor}, transparent);
      margin: 0 auto;
    }

    /* Gold geometric bottom strip */
    .geo-strip-bottom {
      background: linear-gradient(90deg, transparent, ${accentColor}55, transparent);
      height: 1px;
    }

    /* ── BODY ── */
    .email-body {
      padding: 36px 40px 28px;
      color: #2d2d2d;
      font-size: 15px;
      line-height: 1.85;
      direction: rtl;
    }

    .email-body h2 {
      color: ${primaryColor};
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #EFF5F1;
    }

    .email-body p {
      margin: 0 0 16px;
      color: #444444;
    }

    .email-body strong {
      color: #1a1a1a;
    }

    /* CTA Button */
    .btn-wrap {
      text-align: center;
      margin: 28px 0;
    }

    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #0d4a32 0%, ${primaryColor} 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 50px;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.3px;
      box-shadow: 0 4px 14px rgba(26,107,74,0.35);
      border: 2px solid ${accentColor};
    }

    /* OTP / Code box */
    .code-box {
      background: linear-gradient(135deg, #f0faf5, #e6f4ec);
      border: 2px dashed ${primaryColor};
      border-radius: 10px;
      padding: 20px 32px;
      text-align: center;
      font-size: 34px;
      letter-spacing: 10px;
      font-weight: 800;
      color: ${primaryColor};
      margin: 24px 0;
      direction: ltr;
    }

    /* Info / warning card */
    .info-card {
      background: #f0faf5;
      border-right: 4px solid ${primaryColor};
      border-radius: 6px;
      padding: 14px 18px;
      margin: 20px 0;
      font-size: 13px;
      color: #555;
    }

    .warn-card {
      background: #fff8e6;
      border-right: 4px solid ${accentColor};
      border-radius: 6px;
      padding: 14px 18px;
      margin: 20px 0;
      font-size: 13px;
      color: #7a5a00;
    }

    .danger-card {
      background: #fff0f0;
      border-right: 4px solid #e53e3e;
      border-radius: 6px;
      padding: 14px 18px;
      margin: 20px 0;
      font-size: 13px;
      color: #742a2a;
    }

    /* Subtle link text */
    .link-fallback {
      text-align: center;
      font-size: 12px;
      color: #999;
      margin: -10px 0 20px;
      word-break: break-all;
      direction: ltr;
    }

    .link-fallback a {
      color: ${primaryColor};
    }

    /* ── DIVIDER ── */
    .section-divider {
      border: none;
      border-top: 1px solid #e8f0eb;
      margin: 24px 0;
    }

    /* ── FEATURE LIST (welcome email) ── */
    .feature-list {
      list-style: none;
      padding: 0;
      margin: 16px 0;
    }
    .feature-list li {
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
      color: #444;
    }
    .feature-list li:last-child { border-bottom: none; }
    .feature-list li::before {
      content: '✦';
      color: ${accentColor};
      margin-left: 10px;
      font-size: 10px;
    }

    /* ── FOOTER ── */
    .email-footer {
      background: #f7f9f8;
      border-top: 1px solid #deeae2;
      padding: 24px 32px;
      text-align: center;
    }

    .quran-verse {
      color: ${primaryColor};
      font-size: 15px;
      font-weight: 600;
      margin: 0 0 4px;
      font-style: italic;
    }

    .quran-source {
      color: ${accentColor};
      font-size: 11px;
      margin: 0 0 18px;
    }

    .footer-divider {
      width: 40px;
      height: 1px;
      background: ${accentColor};
      margin: 12px auto 16px;
      opacity: 0.5;
    }

    .footer-links {
      margin: 0 0 10px;
    }

    .footer-links a {
      color: #1A6B4A;
      font-size: 12px;
      text-decoration: none;
      margin: 0 8px;
    }

    .footer-copy {
      color: #aaaaaa;
      font-size: 11px;
      margin: 0;
      line-height: 1.8;
    }

    .footer-copy a {
      color: #aaaaaa;
    }

    /* ── MOBILE ── */
    @media only screen and (max-width: 600px) {
      .email-body { padding: 28px 24px 20px; }
      .brand-name { font-size: 28px; }
      .btn { padding: 12px 28px; font-size: 15px; }
      .code-box { font-size: 26px; letter-spacing: 6px; }
      .email-footer { padding: 20px 20px; }
    }
  </style>
</head>
<body>
<div class="email-wrapper">
  <div class="email-container">

    <!-- ═══ HEADER ═══ -->
    <div class="email-header">
      <div class="geo-strip-top"></div>
      <div class="header-inner">
        <div class="geo-pattern">${geometricRow}</div>

        <!-- Lantern Logo (inline SVG) -->
        ${LANTERN_SVG}

        <div class="brand-name">سِـراج</div>
        <div class="brand-tagline">✦ منصة حفظ القرآن الكريم الذكية ✦</div>
        <div class="gold-divider"></div>
      </div>
      <div class="geo-strip-bottom"></div>
    </div>
    <!-- ═══ END HEADER ═══ -->

    <!-- ═══ BODY ═══ -->
    <div class="email-body">
      ${body}
    </div>
    <!-- ═══ END BODY ═══ -->

    <!-- ═══ FOOTER ═══ -->
    <div class="email-footer">
      <p class="quran-verse">﴿ نُورٌ عَلَىٰ نُورٍ ﴾</p>
      <p class="quran-source">سورة النور — آية ٣٥</p>

      <div class="footer-divider"></div>

      <div class="footer-links">
        <a href="${websiteUrl}">موقعنا</a>
        <a href="mailto:${supportEmail}">الدعم الفني</a>
      </div>

      <p class="footer-copy">
        © ${year} منصة سراج · جميع الحقوق محفوظة<br/>
        <a href="#">إلغاء الاشتراك</a>
      </p>
    </div>
    <!-- ═══ END FOOTER ═══ -->

  </div>
</div>
</body>
</html>`;
}
