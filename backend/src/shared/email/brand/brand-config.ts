/**
 * Siraja Email Brand Configuration
 * ─────────────────────────────────
 * Single source-of-truth for all email branding:
 *   - Official color palette (from the Siraja design spec)
 *   - Font stack (Cairo + Arabic system fallbacks)
 *   - Official inline SVG logo
 *   - Logo markup factory (tenant img vs Siraja SVG)
 *   - Button and card HTML helpers (Outlook-safe)
 *
 * Import from here — never hardcode brand values in individual templates.
 */

// ─── Official Color Palette (Siraja Design Spec) ─────────────────────────────

export const SIRAJA_COLORS = {
  // Primary
  primary:         '#1A6B4A',
  primaryDeep:     '#0d4a32',
  primaryLight:    '#22896a',

  // Secondary
  accent:          '#C9A84C',
  accentDeep:      '#A87B28',

  // Backgrounds
  bgPage:          '#F8F7F3',   // warm off-white (spec)
  bgCard:          '#ffffff',
  bgFooter:        '#F4F3EE',
  bgInfoCard:      '#EEF7F2',
  bgWarnCard:      '#FEF3C7',
  bgDangerCard:    '#FEE2E2',

  // Text
  textPrimary:     '#1F2937',   // charcoal (spec)
  textSecondary:   '#4B5563',
  textMuted:       '#9CA3AF',
  textLink:        '#1A6B4A',

  // Semantic
  success:         '#16A34A',
  warning:         '#D97706',
  error:           '#DC2626',
  info:            '#1A6B4A',

  // Borders
  border:          '#DDE6E0',
  borderLight:     '#EEF0EC',

  // ── Dark Mode ──────────────────────────────────────────────────────────────
  darkBgPage:      '#0d1a12',
  darkBgCard:      '#111f17',
  darkBgFooter:    '#091410',
  darkText:        '#D1FAE5',
  darkTextMuted:   '#9DC4B0',
  darkHeading:     '#6EE7B7',
  darkBgInfoCard:  '#14302A',
  darkBgWarnCard:  '#1C1500',
  darkBgDanger:    '#1A0808',
  darkBorder:      '#1E3A2A',
  darkLink:        '#6EE7B7',
} as const;

// ─── Brand defaults ───────────────────────────────────────────────────────────

export const SIRAJA_BRAND_DEFAULTS = {
  tenantName:    'سِراجا',
  tenantTagline: 'منصة حفظ القرآن الكريم الذكية',
  primaryColor:  SIRAJA_COLORS.primary,
  accentColor:   SIRAJA_COLORS.accent,
  supportEmail:  'support@siraja.website',
  websiteUrl:    'https://siraja.website',
} as const;

// ─── Official inline SVG logo ─────────────────────────────────────────────────
// Octagonal Islamic lantern. viewBox="0 0 80 96".
// Rendered at 56×68 px in email headers.
// Designed for visibility on a deep-emerald gradient.
// Inline SVG = zero external HTTP requests, works in all email clients.

export const SIRAJA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 96" width="56" height="68" role="img" aria-label="Siraja" style="display:block;margin:0 auto 8px;">
  <circle cx="40" cy="7" r="5" fill="none" stroke="#C9A84C" stroke-width="2.5"/>
  <line x1="40" y1="12" x2="40" y2="19" stroke="#C9A84C" stroke-width="2" stroke-linecap="round"/>
  <path d="M27 19 Q40 12.5 53 19 L51 28 L29 28 Z" fill="#C9A84C"/>
  <rect x="29" y="27.5" width="22" height="4" rx="2" fill="#A87B28"/>
  <path d="M33 31.5 L47 31.5 L53.5 43 L53.5 63 L47 74.5 L33 74.5 L26.5 63 L26.5 43 Z"
        fill="rgba(201,168,76,0.07)" stroke="#C9A84C" stroke-width="2.2" stroke-linejoin="round"/>
  <line x1="40"   y1="31.5" x2="40"   y2="74.5" stroke="#C9A84C" stroke-width="1"   opacity="0.30"/>
  <line x1="26.5" y1="53"   x2="53.5" y2="53"   stroke="#C9A84C" stroke-width="1"   opacity="0.30"/>
  <line x1="33"   y1="31.5" x2="26.5" y2="43"   stroke="#C9A84C" stroke-width="0.8" opacity="0.22"/>
  <line x1="47"   y1="31.5" x2="53.5" y2="43"   stroke="#C9A84C" stroke-width="0.8" opacity="0.22"/>
  <line x1="33"   y1="74.5" x2="26.5" y2="63"   stroke="#C9A84C" stroke-width="0.8" opacity="0.22"/>
  <line x1="47"   y1="74.5" x2="53.5" y2="63"   stroke="#C9A84C" stroke-width="0.8" opacity="0.22"/>
  <ellipse cx="40" cy="53" rx="13" ry="15" fill="#FCD34D" opacity="0.10"/>
  <ellipse cx="40" cy="53" rx="7"  ry="9"  fill="#FCD34D" opacity="0.18"/>
  <circle  cx="40" cy="53" r="3.5"          fill="#FCD34D" opacity="0.55"/>
  <rect x="29" y="74.5" width="22" height="4" rx="2" fill="#A87B28"/>
  <path d="M36 78.5 L44 78.5 L42 84 L40 87.5 L38 84 Z" fill="#C9A84C"/>
  <circle cx="40" cy="91" r="3.5" fill="#C9A84C"/>
  <circle cx="15.5" cy="53" r="4.5" fill="none" stroke="#C9A84C" stroke-width="1.5" opacity="0.60"/>
  <line   x1="20"   y1="53" x2="26.5" y2="53"   stroke="#C9A84C" stroke-width="1.5" opacity="0.60"/>
  <circle cx="64.5" cy="53" r="4.5" fill="none" stroke="#C9A84C" stroke-width="1.5" opacity="0.60"/>
  <line   x1="53.5" y1="53" x2="60"   y2="53"   stroke="#C9A84C" stroke-width="1.5" opacity="0.60"/>
</svg>`;

// ─── Logo markup factory ──────────────────────────────────────────────────────

/**
 * Returns the logo HTML for email headers.
 * - Tenant logo URL → `<img>` tag (HTTPS only; Cloudflare R2 / CDN)
 * - No URL → official Siraja inline SVG (zero external requests)
 */
export function getLogoMarkup(opts: {
  logoUrl?:     string;
  tenantName?:  string;
  width?:       number;
  height?:      number;
}): string {
  const { logoUrl, tenantName = 'سِراجا', width = 60, height = 60 } = opts;

  if (logoUrl) {
    // Table-based centering for Outlook compatibility
    return `<img src="${logoUrl}" alt="${tenantName}" width="${width}" height="${height}"
      style="display:block;margin:0 auto 8px;border-radius:10px;object-fit:contain;max-width:${width}px;max-height:${height}px;"/>`;
  }

  return SIRAJA_LOGO_SVG;
}

// ─── Font stack ───────────────────────────────────────────────────────────────

export const EMAIL_FONT_STACK =
  "'Cairo', 'Noto Sans Arabic', Tahoma, 'Arial Unicode MS', Arial, sans-serif";

export const GOOGLE_FONTS_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>`;

// ─── VML Button helper (Outlook + all modern clients) ────────────────────────

/**
 * Returns email-safe button HTML.
 *
 * - Outlook 2016-2021: renders a styled pill via VML (Office XML)
 * - All other clients: renders a standard anchor with CSS
 *
 * Usage in templates:
 *   ${getButtonHtml({ href: url, label: 'تأكيد البريد', primary, accent })}
 */
export function getButtonHtml(opts: {
  href:         string;
  label:        string;
  primaryColor: string;
  accentColor:  string;
  width?:       number;
}): string {
  const { href, label, primaryColor, accentColor, width = 240 } = opts;

  return `
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
  href="${href}"
  style="height:50px;v-text-anchor:middle;width:${width}px;"
  arcsize="50%"
  strokecolor="${accentColor}"
  strokeweight="2px"
  fillcolor="${primaryColor}">
  <w:anchorlock/>
  <center style="color:#ffffff;font-family:Tahoma,sans-serif;font-size:15px;font-weight:bold;letter-spacing:0.3px;">${label}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${href}" target="_blank"
   style="background:linear-gradient(135deg,${primaryColor}ee 0%,${primaryColor} 100%);
          border:2px solid ${accentColor};
          border-radius:50px;
          color:#ffffff!important;
          display:inline-block;
          font-family:'Cairo',Tahoma,Arial,sans-serif;
          font-size:15.5px;
          font-weight:700;
          letter-spacing:0.3px;
          mso-hide:all;
          padding:14px 36px;
          text-decoration:none;
          box-shadow:0 4px 16px rgba(26,107,74,0.28);"
   aria-label="${label}">${label}</a>
<!--<![endif]-->`;
}

// ─── Card helpers (table-based, Outlook-safe) ─────────────────────────────────

type CardType = 'info' | 'success' | 'warning' | 'danger';

const CARD_PALETTE: Record<CardType, { bg: string; border: string; text: string }> = {
  info:    { bg: '#EEF7F2', border: '#1A6B4A', text: '#1F2937' },
  success: { bg: '#DCFCE7', border: '#16A34A', text: '#14532D' },
  warning: { bg: '#FEF3C7', border: '#D97706', text: '#78350F' },
  danger:  { bg: '#FEE2E2', border: '#DC2626', text: '#7F1D1D' },
};

/**
 * Returns an Outlook-safe info/warn/danger card using a narrow-cell table border trick.
 * Works in Outlook (VML-free, pure table) and all modern clients.
 */
export function getCardHtml(content: string, type: CardType = 'info'): string {
  const c = CARD_PALETTE[type];
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       style="margin:20px 0;border-radius:8px;overflow:hidden;">
  <tr>
    <td width="4" style="width:4px;min-width:4px;background-color:${c.border};font-size:0;line-height:0;">&nbsp;</td>
    <td style="padding:14px 18px;background-color:${c.bg};color:${c.text};font-size:13.5px;line-height:1.75;font-family:'Cairo',Tahoma,Arial,sans-serif;border-top:1px solid ${c.border}22;border-bottom:1px solid ${c.border}22;border-right:1px solid ${c.border}22;">${content}</td>
  </tr>
</table>`;
}

/**
 * OTP / verification code box. Table-based for Outlook.
 */
export function getCodeBoxHtml(code: string, primaryColor: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       style="margin:24px 0;">
  <tr>
    <td align="center" bgcolor="#EEF7F2"
        style="background-color:#EEF7F2;border:2px dashed ${primaryColor};border-radius:12px;padding:22px 32px;">
      <div style="font-size:38px;letter-spacing:14px;font-weight:800;color:${primaryColor};
                  font-family:'Courier New',Courier,monospace;direction:ltr;
                  text-shadow:0 1px 2px rgba(0,0,0,0.08);">${code}</div>
    </td>
  </tr>
</table>`;
}

// ─── URL safety helper ────────────────────────────────────────────────────────

/** Returns true only for valid, publicly accessible HTTPS URLs. */
export function isSafeLogoUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}
