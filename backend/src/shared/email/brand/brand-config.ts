/**
 * Siraja Email Brand Configuration
 * ─────────────────────────────────
 * Central source-of-truth for all email branding:
 *   - Default colors, URLs, text
 *   - Official inline SVG logo (no external dependency)
 *   - Logo markup factory (tenant img vs. Siraja SVG fallback)
 *
 * Import from here — never hardcode brand values in individual templates.
 */

// ─── Colors ──────────────────────────────────────────────────────────────────

export const SIRAJA_COLORS = {
  /** Deep emerald — primary brand colour */
  primary:        '#1A6B4A',
  primaryDeep:    '#0d4a32',
  primaryLight:   '#22896a',
  /** Gold accent */
  accent:         '#C9A84C',
  accentDeep:     '#A87B28',
  /** Backgrounds */
  bgPage:         '#EFF5F1',
  bgCard:         '#ffffff',
  bgFooter:       '#f7f9f8',
  bgInfoCard:     '#f0faf5',
  bgWarnCard:     '#fff8e6',
  bgDangerCard:   '#fff0f0',
  /** Dark-mode equivalents */
  darkBgPage:     '#0d1f15',
  darkBgCard:     '#122318',
  darkBgFooter:   '#0a1910',
  darkText:       '#e0ebe3',
  darkTextMuted:  '#a8c0b0',
  darkHeading:    '#7ecba1',
  darkBgInfoCard: '#1a3226',
  darkBgWarnCard: '#2a2010',
  darkBgDanger:   '#2a1010',
  darkBorder:     '#2d4a38',
} as const;

// ─── Default brand data ───────────────────────────────────────────────────────

export const SIRAJA_BRAND_DEFAULTS = {
  tenantName:   'سراج',
  tenantTagline:'✦ منصة حفظ القرآن الكريم الذكية ✦',
  primaryColor: SIRAJA_COLORS.primary,
  accentColor:  SIRAJA_COLORS.accent,
  supportEmail: 'support@siraja.website',
  websiteUrl:   'https://siraja.website',
} as const;

// ─── Official inline SVG logo ─────────────────────────────────────────────────
// Rendered at 52×62 px in the email header.
// Designed to be visible on the deep-emerald gradient header.
// No external image dependency — works in all email clients.

export const SIRAJA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 96" width="52" height="62" role="img" aria-label="Siraja" style="display:block;margin:0 auto 6px;">
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
 * Returns the HTML markup for the logo in email headers.
 *
 * - If `logoUrl` is provided (tenant custom logo): renders an <img> tag.
 *   The URL must be publicly accessible (Cloudflare R2 public URL, CDN, etc.)
 * - Otherwise: renders the official Siraja inline SVG (works in ALL clients).
 */
export function getLogoMarkup(opts: {
  logoUrl?: string;
  tenantName?: string;
  width?: number;
  height?: number;
}): string {
  const { logoUrl, tenantName = 'سراج', width = 60, height = 60 } = opts;

  if (logoUrl) {
    return `<img
      src="${logoUrl}"
      alt="${tenantName}"
      width="${width}"
      height="${height}"
      style="display:block;margin:0 auto 6px;border-radius:8px;object-fit:contain;max-width:${width}px;max-height:${height}px;"
    />`;
  }

  return SIRAJA_LOGO_SVG;
}

// ─── Font stack ───────────────────────────────────────────────────────────────

/**
 * Arabic-optimised font stack.
 * Cairo loads via Google Fonts link in <head>; system fallbacks handle Outlook.
 */
export const EMAIL_FONT_STACK =
  "'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, 'Arial Unicode MS', Arial, sans-serif";

/**
 * Google Fonts <link> tags to inject in <head>.
 * Cairo covers Arabic and Latin with excellent Gmail rendering.
 * The preconnect tags reduce latency in webmail clients that honour them.
 */
export const GOOGLE_FONTS_LINK = `
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />`;
