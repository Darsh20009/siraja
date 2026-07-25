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

// ─── Islamic geometric ornament band ─────────────────────────────────────────
/**
 * Returns an inline SVG band of 8-pointed Islamic stars connected by a
 * geometric lattice. Used as the ornamental header row in all email templates.
 *
 * Wrapped in MSO conditionals so Outlook never sees SVG (it cannot render it).
 * Modern clients — Gmail, Apple Mail, Yahoo, Samsung Mail — render it fully.
 * Opacity is intentionally low so the emerald gradient shines through.
 */
export function getGeoPatternBand(): string {
  const HEIGHT   = 40;
  const Y        = HEIGHT / 2;   // vertical centre = 20
  const R        = 13;           // outer star radius
  const SPACING  = 52;           // horizontal distance between star centres
  const COUNT    = Math.ceil(620 / SPACING) + 1;
  const GOLD     = '#C9A84C';

  /**
   * 8-pointed star polygon centred at (cx, Y).
   * Outer radius R, inner radius 5, interleaved outer/inner vertices.
   */
  function starPoints(cx: number): string {
    return [
      `${cx},${Y - R}`,           `${cx + 1.9},${Y - 4.6}`,
      `${cx + 9.2},${Y - 9.2}`,  `${cx + 4.6},${Y - 1.9}`,
      `${cx + R},${Y}`,           `${cx + 4.6},${Y + 1.9}`,
      `${cx + 9.2},${Y + 9.2}`,  `${cx + 1.9},${Y + 4.6}`,
      `${cx},${Y + R}`,           `${cx - 1.9},${Y + 4.6}`,
      `${cx - 9.2},${Y + 9.2}`,  `${cx - 4.6},${Y + 1.9}`,
      `${cx - R},${Y}`,           `${cx - 4.6},${Y - 1.9}`,
      `${cx - 9.2},${Y - 9.2}`,  `${cx - 1.9},${Y - 4.6}`,
    ].join(' ');
  }

  const els: string[] = [];

  for (let i = 0; i < COUNT; i++) {
    const cx = 26 + i * SPACING;

    // 8-pointed star
    els.push(
      `<polygon points="${starPoints(cx)}" fill="none" stroke="${GOLD}" ` +
      `stroke-width="1.2" stroke-linejoin="round"/>`
    );

    // Connector to next star
    if (i < COUNT - 1) {
      const mid      = cx + SPACING / 2;
      const lineFrom = cx + R + 1;
      const lineTo   = cx + SPACING - R - 1;
      // Left segment
      els.push(`<line x1="${lineFrom}" y1="${Y}" x2="${mid - 4}" y2="${Y}" stroke="${GOLD}" stroke-width="0.8" opacity="0.55"/>`);
      // Central diamond
      els.push(`<polygon points="${mid},${Y - 4} ${mid + 4},${Y} ${mid},${Y + 4} ${mid - 4},${Y}" fill="none" stroke="${GOLD}" stroke-width="0.9" opacity="0.70"/>`);
      // Right segment
      els.push(`<line x1="${mid + 4}" y1="${Y}" x2="${lineTo}" y2="${Y}" stroke="${GOLD}" stroke-width="0.8" opacity="0.55"/>`);
    }
  }

  return `
<!--[if !mso]><!-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 ${HEIGHT}"
     width="100%" height="${HEIGHT}"
     style="display:block;opacity:0.30;" aria-hidden="true" focusable="false">
  ${els.join('\n  ')}
</svg>
<!--<![endif]-->
<!--[if mso]><table align="center" border="0" cellpadding="0" cellspacing="0" width="64"><tr><td height="2" bgcolor="${GOLD}" style="height:2px;line-height:2px;font-size:0;opacity:0.5;">&nbsp;</td></tr></table><![endif]-->`;
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

// ─── Per-template SVG illustrations ──────────────────────────────────────────

export type EmailIllustrationType =
  | 'welcome'
  | 'verification'
  | 'otp'
  | 'password-reset'
  | 'notification'
  | 'system-alert'
  | 'invitation'
  | 'weekly-summary'
  | 'monthly-report'
  | 'security-alert'
  | 'achievement'
  | 'gamification-reward';

/**
 * Returns a compact inline SVG illustration for the top of an email body.
 * Wrapped in MSO conditionals — Outlook sees nothing, modern clients render it.
 * No external resources, no JavaScript.
 */
export function getEmailIllustration(
  type: EmailIllustrationType,
  primaryColor: string = SIRAJA_COLORS.primary,
  accentColor: string  = SIRAJA_COLORS.accent,
): string {
  const P  = primaryColor;
  const A  = accentColor;
  const bg = `${P}14`;

  const svgs: Record<EmailIllustrationType, string> = {

    welcome: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="82" viewBox="0 0 96 82" aria-hidden="true">
  <path d="M48 12 L48 72 M48 12 C33 8 16 14 5 24 L5 72 C16 62 33 64 48 72
           M48 12 C63 8 80 14 91 24 L91 72 C80 62 63 64 48 72"
        stroke="${P}" stroke-width="2.8" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
  <line x1="13" y1="33" x2="44" y2="29" stroke="${P}" stroke-width="1.4" opacity="0.38"/>
  <line x1="13" y1="42" x2="44" y2="38" stroke="${P}" stroke-width="1.4" opacity="0.38"/>
  <line x1="13" y1="51" x2="44" y2="47" stroke="${P}" stroke-width="1.4" opacity="0.38"/>
  <line x1="52" y1="29" x2="83" y2="33" stroke="${P}" stroke-width="1.4" opacity="0.38"/>
  <line x1="52" y1="38" x2="83" y2="42" stroke="${P}" stroke-width="1.4" opacity="0.38"/>
  <line x1="52" y1="47" x2="83" y2="51" stroke="${P}" stroke-width="1.4" opacity="0.38"/>
  <circle cx="48" cy="5"  r="3.5" fill="${A}"/>
  <circle cx="38" cy="2"  r="2.2" fill="${A}" opacity="0.55"/>
  <circle cx="58" cy="2"  r="2.2" fill="${A}" opacity="0.55"/>
  <circle cx="28" cy="7"  r="1.5" fill="${A}" opacity="0.32"/>
  <circle cx="68" cy="7"  r="1.5" fill="${A}" opacity="0.32"/>
</svg>`,

    verification: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="90" viewBox="0 0 80 90" aria-hidden="true">
  <path d="M40 4 L76 20 L76 48 C76 66 58 79 40 86 C22 79 4 66 4 48 L4 20 Z"
        fill="${bg}" stroke="${P}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M40 16 L66 28 L66 48 C66 61 53 71 40 76 C27 71 14 61 14 48 L14 28 Z"
        fill="${bg}" stroke="${P}" stroke-width="1.2" opacity="0.38"/>
  <path d="M25 46 L36 58 L58 33" stroke="${P}" stroke-width="3.5"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`,

    otp: `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="88" viewBox="0 0 72 88" aria-hidden="true">
  <rect x="6" y="34" width="60" height="48" rx="10" fill="${bg}" stroke="${P}" stroke-width="2.5"/>
  <path d="M22 34 L22 20 A14 14 0 0 1 50 20 L50 34"
        stroke="${P}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <circle cx="36" cy="58" r="11" fill="${P}18" stroke="${P}" stroke-width="1.6"/>
  <circle cx="36" cy="58" r="4.5" fill="${A}"/>
  <rect x="13" y="73" width="12" height="4" rx="2" fill="${P}" opacity="0.22"/>
  <rect x="30" y="73" width="12" height="4" rx="2" fill="${P}" opacity="0.22"/>
  <rect x="47" y="73" width="12" height="4" rx="2" fill="${P}" opacity="0.22"/>
</svg>`,

    'password-reset': `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="78" viewBox="0 0 90 78" aria-hidden="true">
  <circle cx="26" cy="38" r="22" fill="${A}14" stroke="${A}" stroke-width="2.4"/>
  <circle cx="26" cy="38" r="11" fill="${bg}" stroke="${P}" stroke-width="2.2"/>
  <path d="M42 38 L80 38" stroke="${A}" stroke-width="2.8" stroke-linecap="round"/>
  <path d="M68 28 L80 38 L68 48" stroke="${A}" stroke-width="2.8"
        stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M54 14 A30 30 0 0 1 82 38" stroke="${P}" stroke-width="1.8" fill="none"
        stroke-linecap="round" stroke-dasharray="4 3" opacity="0.45"/>
  <polygon points="55,6 55,18 47,12" fill="${P}" opacity="0.45"/>
</svg>`,

    notification: `<svg xmlns="http://www.w3.org/2000/svg" width="76" height="86" viewBox="0 0 76 86" aria-hidden="true">
  <path d="M38 8 C24 8 14 21 14 37 L14 56 L6 66 L70 66 L62 56 L62 37 C62 21 52 8 38 8 Z"
        fill="${bg}" stroke="${P}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M28 66 A10 10 0 0 0 48 66"
        fill="none" stroke="${P}" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="38" y1="4" x2="38" y2="8" stroke="${P}" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="62" cy="18" r="9" fill="#DC2626" stroke="white" stroke-width="2"/>
  <line x1="62" y1="13" x2="62" y2="19" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="62" cy="23" r="1.4" fill="white"/>
</svg>`,

    'system-alert': `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="78" viewBox="0 0 84 78" aria-hidden="true">
  <polygon points="42,4 80,72 4,72"
           fill="#D9770614" stroke="#D97706" stroke-width="2.5" stroke-linejoin="round"/>
  <polygon points="42,16 70,64 14,64"
           fill="#D9770608" stroke="#D97706" stroke-width="1" opacity="0.38"/>
  <line x1="42" y1="30" x2="42" y2="50" stroke="#D97706" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="42" cy="60" r="3" fill="#D97706"/>
</svg>`,

    invitation: `<svg xmlns="http://www.w3.org/2000/svg" width="92" height="76" viewBox="0 0 92 76" aria-hidden="true">
  <rect x="4" y="18" width="84" height="54" rx="8" fill="${bg}" stroke="${P}" stroke-width="2.5"/>
  <path d="M4 26 L46 50 L88 26" stroke="${P}" stroke-width="2.2" fill="none"/>
  <line x1="4"  y1="18" x2="46" y2="42" stroke="${P}" stroke-width="1.2" opacity="0.28"/>
  <line x1="88" y1="18" x2="46" y2="42" stroke="${P}" stroke-width="1.2" opacity="0.28"/>
  <circle cx="46" cy="10" r="5.5" fill="${A}"/>
  <circle cx="34" cy="6.5" r="3"   fill="${A}" opacity="0.55"/>
  <circle cx="58" cy="6.5" r="3"   fill="${A}" opacity="0.55"/>
  <circle cx="22" cy="10" r="2"   fill="${A}" opacity="0.30"/>
  <circle cx="70" cy="10" r="2"   fill="${A}" opacity="0.30"/>
</svg>`,

    'weekly-summary': `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="78" viewBox="0 0 88 78" aria-hidden="true">
  <line x1="8" y1="70" x2="80" y2="70" stroke="${P}" stroke-width="1.8" stroke-linecap="round" opacity="0.35"/>
  <rect x="10" y="48" width="14" height="22" rx="3" fill="${P}" opacity="0.28"/>
  <rect x="28" y="36" width="14" height="34" rx="3" fill="${P}" opacity="0.45"/>
  <rect x="46" y="22" width="14" height="48" rx="3" fill="${P}" opacity="0.65"/>
  <rect x="64" y="10" width="14" height="60" rx="3" fill="${P}"/>
  <polyline points="17,48 35,36 53,22 71,10"
            stroke="${A}" stroke-width="2.2" fill="none"
            stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="17" cy="48" r="3.5" fill="${A}"/>
  <circle cx="35" cy="36" r="3.5" fill="${A}"/>
  <circle cx="53" cy="22" r="3.5" fill="${A}"/>
  <circle cx="71" cy="10" r="4"   fill="${A}"/>
</svg>`,

    'monthly-report': `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="88" viewBox="0 0 80 88" aria-hidden="true">
  <rect x="6" y="14" width="68" height="70" rx="8" fill="${bg}" stroke="${P}" stroke-width="2.5"/>
  <rect x="6" y="14" width="68" height="24" rx="8" fill="${P}"/>
  <rect x="6" y="28" width="68" height="10" fill="${P}"/>
  <circle cx="22" cy="8"  r="5" fill="${P}" stroke="white" stroke-width="2"/>
  <circle cx="58" cy="8"  r="5" fill="${P}" stroke="white" stroke-width="2"/>
  <path d="M22 58 L33 70 L58 47" stroke="${P}" stroke-width="3.2"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`,

    'security-alert': `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="90" viewBox="0 0 80 90" aria-hidden="true">
  <path d="M40 4 L76 20 L76 48 C76 66 58 79 40 86 C22 79 4 66 4 48 L4 20 Z"
        fill="#DC262612" stroke="#DC2626" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="26" y="36" width="28" height="24" rx="6"
        fill="#DC262614" stroke="#DC2626" stroke-width="2"/>
  <path d="M32 36 L32 30 A8 8 0 0 1 48 30 L48 36"
        stroke="#DC2626" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <line x1="40" y1="44" x2="40" y2="50"
        stroke="#DC2626" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="40" cy="54" r="2" fill="#DC2626"/>
</svg>`,

    achievement: `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="92" viewBox="0 0 88 92" aria-hidden="true">
  <polygon points="44,4 54,33 84,33 61,51 70,80 44,63 18,80 27,51 4,33 34,33"
           fill="${A}1a" stroke="${A}" stroke-width="2.2" stroke-linejoin="round"/>
  <polygon points="44,16 51,37 73,37 56,50 63,71 44,58 25,71 32,50 15,37 37,37"
           fill="${A}" opacity="0.20"/>
  <polygon points="44,26 48,38 61,38 51,46 55,59 44,52 33,59 37,46 27,38 40,38"
           fill="${A}" opacity="0.52"/>
  <circle cx="44" cy="44" r="8" fill="${A}" opacity="0.72"/>
  <line x1="44" y1="80" x2="44" y2="88" stroke="${A}" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="30" y="84" width="28" height="6" rx="3" fill="${A}" opacity="0.42"/>
</svg>`,

    'gamification-reward': `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="90" viewBox="0 0 88 90" aria-hidden="true">
  <polygon points="44,2 84,28 74,74 14,74 4,28"
           fill="${A}14" stroke="${A}" stroke-width="2.4" stroke-linejoin="round"/>
  <polygon points="44,14 74,34 66,66 22,66 14,34"
           fill="${A}0a" stroke="${A}" stroke-width="1.2" opacity="0.40"/>
  <polygon points="44,24 54,42 66,42 60,52 64,64 44,56 24,64 28,52 22,42 34,42"
           fill="${P}1a" stroke="${P}" stroke-width="1.5"/>
  <circle cx="44" cy="42" r="12" fill="${P}18" stroke="${P}" stroke-width="1.5"/>
  <text x="44" y="47" text-anchor="middle" font-size="14" font-weight="800"
        fill="${P}" font-family="Arial,sans-serif">★</text>
  <circle cx="8"  cy="28" r="3.5" fill="${A}" opacity="0.45"/>
  <circle cx="80" cy="28" r="3.5" fill="${A}" opacity="0.45"/>
  <circle cx="4"  cy="50" r="2.5" fill="${A}" opacity="0.28"/>
  <circle cx="84" cy="50" r="2.5" fill="${A}" opacity="0.28"/>
</svg>`,
  };

  const svg = svgs[type] ?? svgs.notification;

  return `<!--[if !mso]><!-->
<div style="text-align:center;padding:28px 0 6px;font-size:0;line-height:0;mso-hide:all;" aria-hidden="true">
  ${svg}
</div>
<!--<![endif]-->`;
}

// ─── Social links footer helper ───────────────────────────────────────────────

/**
 * Optional quick-link row in the email footer.
 * Tenants supply an array of { label, url } entries (e.g. their website,
 * social profiles, custom page). Renders as pipe-separated links.
 * Returns an empty string when no links are provided.
 */
export interface SocialLink {
  label: string;
  url:   string;
}

export function getSocialLinksHtml(
  links: SocialLink[],
  primaryColor: string,
): string {
  if (!links.length) return '';

  const cells = links
    .map(
      (l) =>
        `<td style="padding:0 10px;white-space:nowrap;">` +
        `<a href="${l.url}" target="_blank" rel="noopener noreferrer"` +
        ` style="color:${primaryColor};font-size:12px;font-weight:600;` +
        `font-family:'Cairo',Tahoma,Arial,sans-serif;text-decoration:none;">${l.label}</a>` +
        `</td>`,
    )
    .join('<td style="color:#DDE6E0;font-size:11px;padding:0 2px;">·</td>');

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
  <tr>
    <td align="center" style="padding:0 0 12px;">
      <table cellpadding="0" cellspacing="0" border="0" role="presentation">
        <tr>${cells}</tr>
      </table>
    </td>
  </tr>
</table>
`;}

