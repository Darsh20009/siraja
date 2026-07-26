/**
 * Siraja Email Brand Configuration — Premium Edition
 * ────────────────────────────────────────────────────
 * Single source-of-truth for all email branding:
 *   - Official color palette (Siraja design spec)
 *   - Cairo font stack (Arabic + Latin)
 *   - Official inline SVG lantern logo
 *   - Premium Islamic geometric header art
 *   - Pill-gradient VML buttons (Outlook-safe)
 *   - Premium card system (16px radius, soft shadows)
 *   - World-class inline SVG illustrations per template type
 *
 * Design language: Stripe × Notion × Linear — Arabic-first, Quran-centred.
 */

// ─── Official Color Palette ───────────────────────────────────────────────────

export const SIRAJA_COLORS = {
  // Primary emerald
  primary:         '#1A6B4A',
  primaryDeep:     '#0d4a32',
  primaryLight:    '#22896a',
  primaryMid:      '#155c3e',

  // Gold accent
  accent:          '#C9A84C',
  accentDeep:      '#A87B28',
  accentLight:     '#E2C472',

  // Backgrounds
  bgPage:          '#F8F7F3',
  bgCard:          '#ffffff',
  bgFooter:        '#F4F3EE',
  bgInfoCard:      '#EEF7F2',
  bgWarnCard:      '#FEF3C7',
  bgDangerCard:    '#FEE2E2',

  // Text
  textPrimary:     '#1F2937',
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
  darkBgPage:      '#0a1a11',
  darkBgCard:      '#0f1e16',
  darkBgFooter:    '#081310',
  darkText:        '#D1FAE5',
  darkTextMuted:   '#9DC4B0',
  darkHeading:     '#6EE7B7',
  darkBgInfoCard:  '#132d22',
  darkBgWarnCard:  '#1C1500',
  darkBgDanger:    '#1A0808',
  darkBorder:      '#1a3828',
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

// ─── Font stack ───────────────────────────────────────────────────────────────

export const EMAIL_FONT_STACK =
  "'Cairo', 'Noto Sans Arabic', Tahoma, 'Arial Unicode MS', Arial, sans-serif";

export const GOOGLE_FONTS_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>`;

// ─── Official inline SVG lantern logo ─────────────────────────────────────────
// Premium Islamic lantern — octagonal glass body with glowing light.
// Inline SVG = zero external HTTP requests, works in all email clients.

export const SIRAJA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" width="58" height="72" role="img" aria-label="سِراجا" style="display:block;margin:0 auto 6px;">
  <!-- Hanging chain -->
  <line x1="40" y1="0" x2="40" y2="10" stroke="#C9A84C" stroke-width="2" stroke-linecap="round"/>
  <circle cx="40" cy="4" r="2.5" fill="#C9A84C"/>

  <!-- Top cap -->
  <path d="M28 18 Q40 10 52 18 L50 26 L30 26 Z" fill="#C9A84C"/>
  <rect x="30" y="25" width="20" height="3.5" rx="1.75" fill="#A87B28"/>

  <!-- Top decorative ring -->
  <ellipse cx="40" cy="28.75" rx="10" ry="2" fill="none" stroke="#C9A84C" stroke-width="1.2" opacity="0.7"/>

  <!-- Body — octagonal with subtle fill -->
  <path d="M32 29 L48 29 L56 40 L56 62 L48 73 L32 73 L24 62 L24 40 Z"
        fill="rgba(201,168,76,0.06)" stroke="#C9A84C" stroke-width="2" stroke-linejoin="round"/>

  <!-- Inner body glow panels -->
  <path d="M35 33 L45 33 L51 41 L51 61 L45 69 L35 69 L29 61 L29 41 Z"
        fill="rgba(252,211,77,0.08)" stroke="#C9A84C" stroke-width="0.8" opacity="0.45"/>

  <!-- Lattice lines horizontal -->
  <line x1="25" y1="51" x2="55" y2="51" stroke="#C9A84C" stroke-width="0.8" opacity="0.28"/>
  <line x1="26.5" y1="44" x2="53.5" y2="44" stroke="#C9A84C" stroke-width="0.6" opacity="0.18"/>
  <line x1="26.5" y1="58" x2="53.5" y2="58" stroke="#C9A84C" stroke-width="0.6" opacity="0.18"/>

  <!-- Lattice lines vertical -->
  <line x1="40" y1="29" x2="40" y2="73" stroke="#C9A84C" stroke-width="0.8" opacity="0.20"/>

  <!-- Lattice diagonal cuts (cross-hatching) -->
  <line x1="32" y1="29" x2="24" y2="40" stroke="#C9A84C" stroke-width="0.6" opacity="0.16"/>
  <line x1="48" y1="29" x2="56" y2="40" stroke="#C9A84C" stroke-width="0.6" opacity="0.16"/>
  <line x1="32" y1="73" x2="24" y2="62" stroke="#C9A84C" stroke-width="0.6" opacity="0.16"/>
  <line x1="48" y1="73" x2="56" y2="62" stroke="#C9A84C" stroke-width="0.6" opacity="0.16"/>

  <!-- Glow core — layered for depth -->
  <ellipse cx="40" cy="51" rx="14" ry="16" fill="#FCD34D" opacity="0.07"/>
  <ellipse cx="40" cy="51" rx="8"  ry="10" fill="#FCD34D" opacity="0.14"/>
  <ellipse cx="40" cy="51" rx="4.5" ry="5.5" fill="#FCD34D" opacity="0.30"/>
  <circle  cx="40" cy="51" r="2.5" fill="#FDE68A" opacity="0.80"/>

  <!-- Light rays emanating from core -->
  <line x1="40" y1="37" x2="40" y2="31" stroke="#FCD34D" stroke-width="1.2" opacity="0.22" stroke-linecap="round"/>
  <line x1="48" y1="40" x2="52" y2="36" stroke="#FCD34D" stroke-width="1"   opacity="0.18" stroke-linecap="round"/>
  <line x1="32" y1="40" x2="28" y2="36" stroke="#FCD34D" stroke-width="1"   opacity="0.18" stroke-linecap="round"/>

  <!-- Bottom cap -->
  <rect x="30" y="73" width="20" height="3.5" rx="1.75" fill="#A87B28"/>
  <path d="M35 76.5 L45 76.5 L43 83 L40 87 L37 83 Z" fill="#C9A84C"/>
  <circle cx="40" cy="91" r="3" fill="#C9A84C"/>

  <!-- Side accent rings -->
  <circle cx="14" cy="51" r="4" fill="none" stroke="#C9A84C" stroke-width="1.4" opacity="0.55"/>
  <line x1="18"  y1="51" x2="24" y2="51" stroke="#C9A84C" stroke-width="1.4" opacity="0.55"/>
  <circle cx="66" cy="51" r="4" fill="none" stroke="#C9A84C" stroke-width="1.4" opacity="0.55"/>
  <line x1="56"  y1="51" x2="62" y2="51" stroke="#C9A84C" stroke-width="1.4" opacity="0.55"/>
</svg>`;

// ─── Logo markup factory ──────────────────────────────────────────────────────

export function getLogoMarkup(opts: {
  logoUrl?:    string;
  tenantName?: string;
  width?:      number;
  height?:     number;
}): string {
  const { logoUrl, tenantName = 'سِراجا', width = 60, height = 72 } = opts;

  if (logoUrl) {
    return `<img src="${logoUrl}" alt="${tenantName}" width="${width}" height="${height}"
      style="display:block;margin:0 auto 6px;border-radius:12px;object-fit:contain;
             max-width:${width}px;max-height:${height}px;"/>`;
  }
  return SIRAJA_LOGO_SVG;
}

// ─── Islamic geometric ornament band ─────────────────────────────────────────
/**
 * Premium header band: interlocking 8-pointed stars with geometric lattice,
 * connected by diamond nodes and fine connecting lines.
 * Opacity 0.35 so the emerald gradient shines through.
 * Outlook receives a gold thin strip fallback via MSO conditional.
 */
export function getGeoPatternBand(): string {
  const HEIGHT  = 52;
  const CY      = HEIGHT / 2;
  const R       = 14;
  const INNER   = 5.5;
  const SPACING = 56;
  const COUNT   = Math.ceil(640 / SPACING) + 1;
  const GOLD    = '#C9A84C';

  function starPoints(cx: number, cy: number, outer: number, inner: number, points: number): string {
    const pts: string[] = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
    }
    return pts.join(' ');
  }

  const els: string[] = [];

  // Top and bottom decorative lines
  els.push(`<line x1="0" y1="6" x2="600" y2="6" stroke="${GOLD}" stroke-width="0.5" opacity="0.4"/>`);
  els.push(`<line x1="0" y1="${HEIGHT - 6}" x2="600" y2="${HEIGHT - 6}" stroke="${GOLD}" stroke-width="0.5" opacity="0.4"/>`);

  for (let i = 0; i < COUNT; i++) {
    const cx = 28 + i * SPACING;

    // Outer 8-pointed star
    els.push(
      `<polygon points="${starPoints(cx, CY, R, INNER, 8)}"` +
      ` fill="none" stroke="${GOLD}" stroke-width="1.1" stroke-linejoin="round"/>`
    );

    // Inner 4-pointed small star
    els.push(
      `<polygon points="${starPoints(cx, CY, R * 0.42, R * 0.18, 4)}"` +
      ` fill="${GOLD}" opacity="0.50"/>`
    );

    // Connector to next star
    if (i < COUNT - 1) {
      const mid      = cx + SPACING / 2;
      const lineFrom = cx + R + 1.5;
      const lineTo   = cx + SPACING - R - 1.5;
      const dw       = 5;

      // Line segments
      els.push(`<line x1="${lineFrom}" y1="${CY}" x2="${mid - dw}" y2="${CY}" stroke="${GOLD}" stroke-width="0.7" opacity="0.50"/>`);
      els.push(`<line x1="${mid + dw}" y1="${CY}" x2="${lineTo}"   y2="${CY}" stroke="${GOLD}" stroke-width="0.7" opacity="0.50"/>`);

      // Diamond node
      els.push(
        `<polygon points="${mid},${CY - dw} ${mid + dw},${CY} ${mid},${CY + dw} ${mid - dw},${CY}"` +
        ` fill="none" stroke="${GOLD}" stroke-width="0.9" opacity="0.65"/>`
      );
      // Diamond fill dot
      els.push(`<circle cx="${mid}" cy="${CY}" r="1.4" fill="${GOLD}" opacity="0.55"/>`);

      // Top and bottom accent dashes
      els.push(`<line x1="${(lineFrom + mid - dw) / 2}" y1="${CY - 5}" x2="${(lineFrom + mid - dw) / 2}" y2="${CY - 9}" stroke="${GOLD}" stroke-width="0.6" opacity="0.30"/>`);
      els.push(`<line x1="${(lineFrom + mid - dw) / 2}" y1="${CY + 5}" x2="${(lineFrom + mid - dw) / 2}" y2="${CY + 9}" stroke="${GOLD}" stroke-width="0.6" opacity="0.30"/>`);
    }
  }

  return `
<!--[if !mso]><!-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 ${HEIGHT}"
     width="100%" height="${HEIGHT}"
     style="display:block;opacity:0.35;" aria-hidden="true" focusable="false">
  ${els.join('\n  ')}
</svg>
<!--<![endif]-->
<!--[if mso]><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td height="3" bgcolor="#C9A84C" style="height:3px;line-height:3px;font-size:0;opacity:0.6;">&nbsp;</td></tr></table><![endif]-->`;
}

// ─── URL safety helper ────────────────────────────────────────────────────────

export function isSafeLogoUrl(url: string | undefined): boolean {
  if (!url) return false;
  try { return new URL(url).protocol === 'https:'; } catch { return false; }
}

// ─── HTML escape helper ───────────────────────────────────────────────────────
/**
 * Escapes HTML special characters in user-provided text values.
 * Apply to all untrusted string fields before interpolating into HTML.
 * Do NOT apply to URLs (href attributes) or pre-built HTML content strings.
 */
export function escapeHtml(s: string | number | undefined | null): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ─── Social link type ─────────────────────────────────────────────────────────

export interface SocialLink {
  label: string;
  url: string;
  /** Optional emoji or icon character shown before the label */
  icon?: string;
}

export function getSocialLinksHtml(links: SocialLink[], primaryColor: string): string {
  if (!links.length) return '';
  const items = links.map(l =>
    `<a href="${l.url}" target="_blank" rel="noopener noreferrer"
        style="display:inline-block;margin:0 8px;color:${primaryColor};font-size:12px;
               font-family:'Cairo',Tahoma,Arial,sans-serif;text-decoration:none;
               font-weight:600;white-space:nowrap;">
       ${l.icon ? l.icon + '&nbsp;' : ''}${l.label}</a>`
  ).join('<span style="color:#DDE6E0;font-size:11px;margin:0 2px;">·</span>');

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
  <tr>
    <td align="center" style="padding:0 0 16px;">
      ${items}
    </td>
  </tr>
</table>`;
}

// ─── Premium pill-gradient button (Outlook VML + modern) ──────────────────────

export function getButtonHtml(opts: {
  href:         string;
  label:        string;
  primaryColor: string;
  accentColor:  string;
  width?:       number;
  variant?:     'primary' | 'danger' | 'success';
}): string {
  const { href, label, primaryColor, accentColor, width = 240, variant = 'primary' } = opts;

  let fill = primaryColor;
  let border = accentColor;
  let shadow = 'rgba(26,107,74,0.35)';

  if (variant === 'danger') {
    fill = '#DC2626'; border = '#DC2626'; shadow = 'rgba(220,38,38,0.35)';
  } else if (variant === 'success') {
    fill = '#16A34A'; border = '#16A34A'; shadow = 'rgba(22,163,74,0.35)';
  }

  // Derive a slightly lighter shade for gradient top
  const gradTop = fill + 'dd';

  return `
<div class="btn-wrap" style="text-align:center;margin:28px 0;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
  href="${href}"
  style="height:52px;v-text-anchor:middle;width:${width}px;"
  arcsize="50%"
  strokecolor="${border}"
  strokeweight="1.5px"
  fillcolor="${fill}">
  <w:anchorlock/>
  <center style="color:#ffffff;font-family:Tahoma,sans-serif;font-size:15px;font-weight:bold;letter-spacing:0.5px;">${label}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${href}" target="_blank" rel="noopener noreferrer"
   class="btn-primary"
   style="background:linear-gradient(145deg,${gradTop} 0%,${fill} 60%,${SIRAJA_COLORS.primaryDeep} 100%);
          border:1.5px solid ${border};
          border-radius:50px;
          color:#ffffff!important;
          display:inline-block;
          font-family:'Cairo',Tahoma,Arial,sans-serif;
          font-size:15px;
          font-weight:700;
          letter-spacing:0.4px;
          mso-hide:all;
          padding:15px 40px;
          text-decoration:none;
          transition:all 0.2s ease;
          box-shadow:0 4px 20px ${shadow},0 1px 4px rgba(0,0,0,0.12);"
   aria-label="${label}">${label}</a>
<!--<![endif]-->
</div>`;
}

// ─── Card helpers (Outlook-safe, 16px radius) ─────────────────────────────────

type CardType = 'info' | 'success' | 'warning' | 'danger';

const CARD_PALETTE: Record<CardType, { bg: string; border: string; text: string; accent: string }> = {
  info:    { bg: '#EEF7F2', border: '#1A6B4A', text: '#1F2937', accent: '#1A6B4A' },
  success: { bg: '#DCFCE7', border: '#16A34A', text: '#14532D', accent: '#16A34A' },
  warning: { bg: '#FFFBEB', border: '#D97706', text: '#78350F', accent: '#D97706' },
  danger:  { bg: '#FEF2F2', border: '#DC2626', text: '#7F1D1D', accent: '#DC2626' },
};

/**
 * Premium card with left-border accent strip, soft background, 16px radius treatment.
 * Table-based so it renders in Outlook 2016-2021.
 */
export function getCardHtml(content: string, type: CardType = 'info'): string {
  const c = CARD_PALETTE[type];
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       style="margin:18px 0;border-radius:12px;overflow:hidden;
              box-shadow:0 2px 8px rgba(0,0,0,0.06);">
  <tr>
    <td width="5" style="width:5px;min-width:5px;background-color:${c.border};font-size:0;line-height:0;border-radius:0 12px 12px 0;">&nbsp;</td>
    <td class="card-bg-${type}" style="padding:16px 20px;background-color:${c.bg};color:${c.text};
               font-size:13.5px;line-height:1.75;font-family:'Cairo',Tahoma,Arial,sans-serif;
               border-top:1px solid ${c.border}20;border-bottom:1px solid ${c.border}20;
               border-left:1px solid ${c.border}20;border-radius:12px 0 0 12px;">${content}</td>
  </tr>
</table>`;
}

/**
 * Premium OTP / verification code box.
 */
export function getCodeBoxHtml(code: string, primaryColor: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       style="margin:24px 0;">
  <tr>
    <td align="center"
        style="background:linear-gradient(135deg,${primaryColor}0a 0%,${primaryColor}18 100%);
               border:2px solid ${primaryColor}44;border-radius:16px;padding:26px 32px;
               box-shadow:0 4px 16px ${primaryColor}18 inset;">
      <div class="code-box-value"
           style="font-size:40px;letter-spacing:18px;font-weight:900;color:${primaryColor};
                  font-family:'Courier New',Courier,monospace;direction:ltr;
                  text-shadow:0 2px 8px ${primaryColor}30;">${code}</div>
    </td>
  </tr>
</table>`;
}

// ─── Premium stat box helper ──────────────────────────────────────────────────

export function getStatBoxHtml(stats: Array<{ label: string; value: string | number }>): string {
  const cells = stats.map(s => `
    <td align="center" valign="top" width="${Math.floor(100 / stats.length)}%"
        style="padding:16px 10px;border-right:1px solid #EEF0EC;">
      <p style="margin:0 0 4px;font-size:11px;color:#9CA3AF;font-family:'Cairo',Tahoma,Arial,sans-serif;
                font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">${s.label}</p>
      <p style="margin:0;font-size:26px;font-weight:800;color:#1A6B4A;
                font-family:'Cairo',Tahoma,Arial,sans-serif;line-height:1;">${s.value}</p>
    </td>`
  ).join('');

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       style="margin:20px 0;background:#F8F7F3;border-radius:16px;overflow:hidden;
              border:1px solid #EEF0EC;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
  <tr>${cells}</tr>
</table>`;
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
 * Returns a premium inline SVG illustration for the top of an email body.
 * Wrapped in MSO conditionals — Outlook sees nothing, modern clients render it.
 * No external resources. All inline.
 */
export function getEmailIllustration(
  type: EmailIllustrationType,
  primaryColor: string = SIRAJA_COLORS.primary,
  accentColor: string  = SIRAJA_COLORS.accent,
): string {
  const P  = primaryColor;
  const A  = accentColor;
  const bg = `${P}12`;

  const svgs: Record<EmailIllustrationType, string> = {

    // ── Welcome: Open Quran book with radiant light and golden stars ──────────
    welcome: `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="90" viewBox="0 0 110 90" aria-hidden="true">
  <!-- Book glow -->
  <ellipse cx="55" cy="78" rx="36" ry="8" fill="${P}" opacity="0.08"/>
  <!-- Left page -->
  <path d="M12 16 Q12 8 20 8 L52 12 L52 76 Q40 72 20 76 Q12 74 12 66 Z"
        fill="${bg}" stroke="${P}" stroke-width="1.8" stroke-linejoin="round"/>
  <!-- Right page -->
  <path d="M98 16 Q98 8 90 8 L58 12 L58 76 Q70 72 90 76 Q98 74 98 66 Z"
        fill="${bg}" stroke="${P}" stroke-width="1.8" stroke-linejoin="round"/>
  <!-- Spine -->
  <path d="M52 12 L58 12 L58 76 L52 76 Z" fill="${P}" opacity="0.18"/>
  <!-- Left page lines -->
  <line x1="20" y1="28" x2="49" y2="25" stroke="${P}" stroke-width="1.2" opacity="0.30"/>
  <line x1="20" y1="37" x2="49" y2="34" stroke="${P}" stroke-width="1.2" opacity="0.30"/>
  <line x1="20" y1="46" x2="49" y2="43" stroke="${P}" stroke-width="1.2" opacity="0.30"/>
  <line x1="20" y1="55" x2="49" y2="52" stroke="${P}" stroke-width="1.2" opacity="0.30"/>
  <line x1="20" y1="64" x2="49" y2="61" stroke="${P}" stroke-width="1.2" opacity="0.30"/>
  <!-- Right page lines -->
  <line x1="61" y1="25" x2="90" y2="28" stroke="${P}" stroke-width="1.2" opacity="0.30"/>
  <line x1="61" y1="34" x2="90" y2="37" stroke="${P}" stroke-width="1.2" opacity="0.30"/>
  <line x1="61" y1="43" x2="90" y2="46" stroke="${P}" stroke-width="1.2" opacity="0.30"/>
  <line x1="61" y1="52" x2="90" y2="55" stroke="${P}" stroke-width="1.2" opacity="0.30"/>
  <line x1="61" y1="61" x2="90" y2="64" stroke="${P}" stroke-width="1.2" opacity="0.30"/>
  <!-- Radiant light rays from spine -->
  <line x1="55" y1="44" x2="55" y2="3"  stroke="${A}" stroke-width="1.6" opacity="0.55" stroke-linecap="round"/>
  <line x1="55" y1="44" x2="38" y2="10" stroke="${A}" stroke-width="1.2" opacity="0.35" stroke-linecap="round"/>
  <line x1="55" y1="44" x2="72" y2="10" stroke="${A}" stroke-width="1.2" opacity="0.35" stroke-linecap="round"/>
  <line x1="55" y1="44" x2="28" y2="20" stroke="${A}" stroke-width="0.9" opacity="0.22" stroke-linecap="round"/>
  <line x1="55" y1="44" x2="82" y2="20" stroke="${A}" stroke-width="0.9" opacity="0.22" stroke-linecap="round"/>
  <!-- Stars -->
  <circle cx="55" cy="3"  r="3.5" fill="${A}"/>
  <circle cx="38" cy="8"  r="2.2" fill="${A}" opacity="0.70"/>
  <circle cx="72" cy="8"  r="2.2" fill="${A}" opacity="0.70"/>
  <circle cx="26" cy="18" r="1.6" fill="${A}" opacity="0.45"/>
  <circle cx="84" cy="18" r="1.6" fill="${A}" opacity="0.45"/>
  <circle cx="18" cy="32" r="1.2" fill="${A}" opacity="0.28"/>
  <circle cx="92" cy="32" r="1.2" fill="${A}" opacity="0.28"/>
</svg>`,

    // ── Verification: Shield with checkmark and trust rings ──────────────────
    verification: `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="100" viewBox="0 0 90 100" aria-hidden="true">
  <!-- Outer glow ring -->
  <circle cx="45" cy="48" r="40" fill="${P}" opacity="0.05"/>
  <circle cx="45" cy="48" r="32" fill="${P}" opacity="0.06"/>
  <!-- Shield -->
  <path d="M45 6 L80 22 L80 52 C80 70 63 84 45 92 C27 84 10 70 10 52 L10 22 Z"
        fill="${bg}" stroke="${P}" stroke-width="2.2" stroke-linejoin="round"/>
  <!-- Inner shield -->
  <path d="M45 16 L70 28 L70 52 C70 65 57 75 45 82 C33 75 20 65 20 52 L20 28 Z"
        fill="${P}" opacity="0.08" stroke="${P}" stroke-width="1"/>
  <!-- Check mark -->
  <path d="M28 50 L40 63 L64 34"
        stroke="${P}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <!-- Gold accent -->
  <circle cx="45" cy="6" r="3" fill="${A}"/>
  <circle cx="15" cy="26" r="2" fill="${A}" opacity="0.50"/>
  <circle cx="75" cy="26" r="2" fill="${A}" opacity="0.50"/>
</svg>`,

    // ── OTP: Lock with sparkle keyhole and security rings ────────────────────
    otp: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="100" viewBox="0 0 80 100" aria-hidden="true">
  <!-- Glow -->
  <ellipse cx="40" cy="90" rx="26" ry="6" fill="${P}" opacity="0.10"/>
  <!-- Shackle -->
  <path d="M22 42 L22 26 A18 18 0 0 1 58 26 L58 42"
        stroke="${P}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- Body -->
  <rect x="8" y="40" width="64" height="50" rx="14" fill="${bg}" stroke="${P}" stroke-width="2.2"/>
  <!-- Keyhole outer circle -->
  <circle cx="40" cy="64" r="11" fill="${P}" opacity="0.12" stroke="${P}" stroke-width="1.6"/>
  <!-- Keyhole inner -->
  <circle cx="40" cy="60" r="5.5" fill="${P}" opacity="0.55"/>
  <rect x="36.5" y="64" width="7" height="9" rx="2" fill="${P}" opacity="0.55"/>
  <!-- Sparkles -->
  <circle cx="16" cy="52" r="2.2" fill="${A}" opacity="0.70"/>
  <circle cx="64" cy="52" r="2.2" fill="${A}" opacity="0.70"/>
  <circle cx="16" cy="78" r="1.6" fill="${A}" opacity="0.45"/>
  <circle cx="64" cy="78" r="1.6" fill="${A}" opacity="0.45"/>
  <circle cx="40" cy="36" r="2.5" fill="${A}"/>
</svg>`,

    // ── Password Reset: Key with lock and secure glow ─────────────────────────
    'password-reset': `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="80" viewBox="0 0 110 80" aria-hidden="true">
  <!-- Key ring glow -->
  <circle cx="28" cy="36" r="22" fill="${P}" opacity="0.06"/>
  <!-- Key ring -->
  <circle cx="28" cy="36" r="17" fill="${bg}" stroke="${P}" stroke-width="2.5"/>
  <!-- Key ring inner hole -->
  <circle cx="28" cy="36" r="9"  fill="${P}" opacity="0.10" stroke="${P}" stroke-width="1.4"/>
  <!-- Key shaft -->
  <rect x="42" y="33" width="52" height="6" rx="3" fill="${P}" opacity="0.70"/>
  <!-- Key teeth -->
  <rect x="72" y="39" width="5" height="8" rx="2" fill="${P}" opacity="0.70"/>
  <rect x="84" y="39" width="5" height="6" rx="2" fill="${P}" opacity="0.70"/>
  <rect x="60" y="39" width="5" height="10" rx="2" fill="${P}" opacity="0.70"/>
  <!-- Sparkles -->
  <circle cx="28" cy="10" r="2.5" fill="${A}"/>
  <circle cx="10" cy="26" r="1.8" fill="${A}" opacity="0.60"/>
  <circle cx="10" cy="46" r="1.8" fill="${A}" opacity="0.60"/>
  <circle cx="96" cy="27" r="2"   fill="${A}" opacity="0.55"/>
  <circle cx="96" cy="49" r="2"   fill="${A}" opacity="0.55"/>
  <!-- Arrow hint -->
  <path d="M46 18 Q60 8 78 18" stroke="${A}" stroke-width="1.4" fill="none" opacity="0.40" stroke-dasharray="3 3"/>
</svg>`,

    // ── Notification: Bell with ripple rings and notification dot ─────────────
    notification: `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="96" viewBox="0 0 90 96" aria-hidden="true">
  <!-- Ripple rings -->
  <circle cx="45" cy="44" r="36" fill="none" stroke="${P}" stroke-width="0.8" opacity="0.15"/>
  <circle cx="45" cy="44" r="28" fill="none" stroke="${P}" stroke-width="0.8" opacity="0.20"/>
  <!-- Bell body -->
  <path d="M45 12 C30 12 20 24 20 38 L18 62 L72 62 L70 38 C70 24 60 12 45 12 Z"
        fill="${bg}" stroke="${P}" stroke-width="2.2" stroke-linejoin="round"/>
  <!-- Bell bottom rim -->
  <path d="M14 62 Q14 68 45 68 Q76 68 76 62 Z"
        fill="${P}" opacity="0.18" stroke="${P}" stroke-width="1.6"/>
  <!-- Bell clapper -->
  <line x1="45" y1="68" x2="45" y2="76" stroke="${P}" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="45" cy="80" r="5" fill="${P}" opacity="0.50"/>
  <!-- Hanger -->
  <line x1="45" y1="6" x2="45" y2="12" stroke="${P}" stroke-width="2" stroke-linecap="round"/>
  <circle cx="45" cy="5" r="3" fill="${P}" opacity="0.60"/>
  <!-- Notification dot -->
  <circle cx="65" cy="18" r="9" fill="${A}" stroke="#ffffff" stroke-width="2.5"/>
  <!-- Inner lines (motion) -->
  <path d="M28 38 Q28 32 30 28" stroke="${P}" stroke-width="1.2" fill="none" opacity="0.30" stroke-linecap="round"/>
  <path d="M62 38 Q62 32 60 28" stroke="${P}" stroke-width="1.2" fill="none" opacity="0.30" stroke-linecap="round"/>
</svg>`,

    // ── System Alert: Server rack with alert indicator ────────────────────────
    'system-alert': `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="90" viewBox="0 0 100 90" aria-hidden="true">
  <!-- Server stack shadow -->
  <ellipse cx="50" cy="86" rx="34" ry="5" fill="${P}" opacity="0.10"/>
  <!-- Server 1 (top) -->
  <rect x="14" y="14" width="72" height="18" rx="6" fill="${bg}" stroke="${P}" stroke-width="2"/>
  <circle cx="26" cy="23" r="4" fill="${P}" opacity="0.55"/>
  <circle cx="38" cy="23" r="4" fill="${P}" opacity="0.30"/>
  <rect x="52" y="19.5" width="28" height="7" rx="3.5" fill="${P}" opacity="0.15"/>
  <!-- Server 2 (mid) -->
  <rect x="14" y="38" width="72" height="18" rx="6" fill="${bg}" stroke="${P}" stroke-width="2"/>
  <circle cx="26" cy="47" r="4" fill="${A}" opacity="0.80"/>
  <circle cx="38" cy="47" r="4" fill="${P}" opacity="0.30"/>
  <rect x="52" y="43.5" width="28" height="7" rx="3.5" fill="${P}" opacity="0.15"/>
  <!-- Server 3 (bottom) -->
  <rect x="14" y="62" width="72" height="18" rx="6" fill="${bg}" stroke="${P}" stroke-width="2"/>
  <circle cx="26" cy="71" r="4" fill="${P}" opacity="0.55"/>
  <circle cx="38" cy="71" r="4" fill="${P}" opacity="0.55"/>
  <rect x="52" y="67.5" width="28" height="7" rx="3.5" fill="${P}" opacity="0.15"/>
  <!-- Alert badge -->
  <circle cx="80" cy="14" r="13" fill="${A}" stroke="#ffffff" stroke-width="2.5"/>
  <text x="80" y="19" text-anchor="middle" fill="#ffffff" font-size="15" font-family="Tahoma,sans-serif" font-weight="bold">!</text>
</svg>`,

    // ── Invitation: Open doorway with warm golden light ───────────────────────
    invitation: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
  <!-- Floor shadow -->
  <ellipse cx="50" cy="94" rx="38" ry="5" fill="${P}" opacity="0.10"/>
  <!-- Door frame -->
  <rect x="18" y="12" width="64" height="78" rx="6" fill="${bg}" stroke="${P}" stroke-width="2.2"/>
  <!-- Arch top -->
  <path d="M18 28 Q18 12 50 12 Q82 12 82 28" fill="${P}" opacity="0.12" stroke="${P}" stroke-width="2.2"/>
  <!-- Door open (left panel) -->
  <rect x="22" y="30" width="25" height="58" rx="3" fill="${P}" opacity="0.08" stroke="${P}" stroke-width="1.5"/>
  <!-- Golden light beam from open door -->
  <path d="M47 30 L64 42 L64 88 L47 88 Z" fill="${A}" opacity="0.12"/>
  <path d="M47 35 L80 52 L80 88" fill="${A}" opacity="0.07"/>
  <!-- Doorknob -->
  <circle cx="40" cy="60" r="3.5" fill="${A}" stroke="${A}" stroke-width="1"/>
  <!-- Stars / sparkles around door -->
  <circle cx="14" cy="18" r="2.5" fill="${A}" opacity="0.65"/>
  <circle cx="86" cy="18" r="2.5" fill="${A}" opacity="0.65"/>
  <circle cx="10" cy="50" r="1.8" fill="${A}" opacity="0.45"/>
  <circle cx="90" cy="50" r="1.8" fill="${A}" opacity="0.45"/>
  <circle cx="50" cy="5"  r="3"   fill="${A}"/>
  <!-- Welcome path on floor -->
  <path d="M30 94 L70 94" stroke="${A}" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.50"/>
</svg>`,

    // ── Weekly Summary: Bar chart with upward trend ───────────────────────────
    'weekly-summary': `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="86" viewBox="0 0 110 86" aria-hidden="true">
  <!-- Chart background -->
  <rect x="8" y="8" width="94" height="66" rx="10" fill="${bg}" stroke="${P}" stroke-width="1.6" opacity="0.60"/>
  <!-- Grid lines -->
  <line x1="16" y1="56" x2="94" y2="56" stroke="${P}" stroke-width="0.6" opacity="0.20"/>
  <line x1="16" y1="44" x2="94" y2="44" stroke="${P}" stroke-width="0.6" opacity="0.20"/>
  <line x1="16" y1="32" x2="94" y2="32" stroke="${P}" stroke-width="0.6" opacity="0.20"/>
  <line x1="16" y1="20" x2="94" y2="20" stroke="${P}" stroke-width="0.6" opacity="0.20"/>
  <!-- Bars (Mon–Sun, growing trend) -->
  <rect x="18" y="48" width="9" height="20" rx="3" fill="${P}" opacity="0.40"/>
  <rect x="32" y="42" width="9" height="26" rx="3" fill="${P}" opacity="0.50"/>
  <rect x="46" y="36" width="9" height="32" rx="3" fill="${P}" opacity="0.60"/>
  <rect x="60" y="28" width="9" height="40" rx="3" fill="${P}" opacity="0.75"/>
  <rect x="74" y="20" width="9" height="48" rx="3" fill="${P}"/>
  <!-- Trend line -->
  <polyline points="22,48 36,42 50,36 64,28 78,20"
            stroke="${A}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Trend dots -->
  <circle cx="22" cy="48" r="3" fill="${A}"/>
  <circle cx="36" cy="42" r="3" fill="${A}"/>
  <circle cx="50" cy="36" r="3" fill="${A}"/>
  <circle cx="64" cy="28" r="3" fill="${A}"/>
  <circle cx="78" cy="20" r="4" fill="${A}" stroke="#ffffff" stroke-width="1.5"/>
  <!-- Up arrow -->
  <path d="M88 8 L96 2 L96 14 Z" fill="${A}" opacity="0.80"/>
  <!-- Label row -->
  <line x1="8" y1="78" x2="102" y2="78" stroke="${P}" stroke-width="1" opacity="0.20"/>
</svg>`,

    // ── Monthly Report: Calendar with achievement stars ────────────────────────
    'monthly-report': `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="96" viewBox="0 0 100 96" aria-hidden="true">
  <!-- Shadow -->
  <ellipse cx="50" cy="92" rx="36" ry="5" fill="${P}" opacity="0.10"/>
  <!-- Calendar body -->
  <rect x="8" y="18" width="84" height="70" rx="10" fill="${bg}" stroke="${P}" stroke-width="2"/>
  <!-- Header bar -->
  <rect x="8" y="18" width="84" height="22" rx="10" fill="${P}" opacity="0.85"/>
  <rect x="8" y="30" width="84" height="10" rx="0" fill="${P}" opacity="0.85"/>
  <!-- Ring posts -->
  <rect x="28" y="10" width="6" height="20" rx="3" fill="${P}"/>
  <rect x="66" y="10" width="6" height="20" rx="3" fill="${P}"/>
  <!-- Header text hint -->
  <rect x="36" y="24" width="28" height="5" rx="2.5" fill="#ffffff" opacity="0.40"/>
  <!-- Grid dots for dates -->
  <circle cx="22" cy="55" r="2.5" fill="${P}" opacity="0.30"/>
  <circle cx="36" cy="55" r="2.5" fill="${P}" opacity="0.30"/>
  <circle cx="50" cy="55" r="2.5" fill="${P}" opacity="0.30"/>
  <circle cx="64" cy="55" r="2.5" fill="${P}" opacity="0.30"/>
  <circle cx="78" cy="55" r="2.5" fill="${P}" opacity="0.30"/>
  <circle cx="22" cy="70" r="2.5" fill="${P}" opacity="0.30"/>
  <circle cx="36" cy="70" r="2.5" fill="${P}" opacity="0.30"/>
  <circle cx="50" cy="70" r="2.5" fill="${P}" opacity="0.30"/>
  <circle cx="64" cy="70" r="2.5" fill="${P}" opacity="0.30"/>
  <circle cx="78" cy="70" r="2.5" fill="${P}" opacity="0.30"/>
  <!-- Highlighted achievement days -->
  <circle cx="36" cy="55" r="8" fill="${A}" opacity="0.25"/>
  <circle cx="36" cy="55" r="4" fill="${A}" opacity="0.60"/>
  <circle cx="64" cy="70" r="8" fill="${P}" opacity="0.18"/>
  <circle cx="64" cy="70" r="4" fill="${P}" opacity="0.70"/>
  <!-- Stars -->
  <circle cx="84" cy="10" r="3.5" fill="${A}"/>
  <circle cx="14" cy="10" r="2.5" fill="${A}" opacity="0.70"/>
  <circle cx="96" cy="50" r="2"   fill="${A}" opacity="0.55"/>
</svg>`,

    // ── Security Alert: Shield with exclamation, red accent ──────────────────
    'security-alert': `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="100" viewBox="0 0 90 100" aria-hidden="true">
  <!-- Shield glow -->
  <circle cx="45" cy="48" r="42" fill="#DC262608"/>
  <!-- Shield -->
  <path d="M45 6 L80 22 L80 52 C80 72 63 86 45 94 C27 86 10 72 10 52 L10 22 Z"
        fill="#FEE2E210" stroke="#DC2626" stroke-width="2.2" stroke-linejoin="round"/>
  <!-- Inner shield -->
  <path d="M45 18 L68 30 L68 52 C68 64 57 73 45 80 C33 73 22 64 22 52 L22 30 Z"
        fill="#DC262608" stroke="#DC2626" stroke-width="1" opacity="0.40"/>
  <!-- Exclamation mark -->
  <rect x="41" y="36" width="8" height="24" rx="4" fill="#DC2626" opacity="0.85"/>
  <circle cx="45" cy="68" r="5" fill="#DC2626" opacity="0.85"/>
  <!-- Gold urgency dots -->
  <circle cx="45" cy="6"  r="3" fill="${A}"/>
  <circle cx="12" cy="24" r="2" fill="${A}" opacity="0.55"/>
  <circle cx="78" cy="24" r="2" fill="${A}" opacity="0.55"/>
</svg>`,

    // ── Achievement: Trophy with laurel wreath and gold stars ─────────────────
    achievement: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
  <!-- Trophy glow -->
  <ellipse cx="50" cy="90" rx="28" ry="6" fill="${A}" opacity="0.15"/>
  <!-- Base -->
  <rect x="32" y="80" width="36" height="8" rx="4" fill="${A}" opacity="0.80"/>
  <rect x="38" y="72" width="24" height="10" rx="3" fill="${A}" opacity="0.65"/>
  <!-- Trophy cup body -->
  <path d="M24 12 L76 12 L72 58 Q70 68 50 68 Q30 68 28 58 Z"
        fill="${bg}" stroke="${A}" stroke-width="2.2" stroke-linejoin="round"/>
  <!-- Cup inner highlight -->
  <path d="M32 16 L68 16 L65 54 Q63 64 50 64 Q37 64 35 54 Z"
        fill="${A}" opacity="0.10"/>
  <!-- Handles -->
  <path d="M24 12 Q10 14 10 30 Q10 44 24 44" stroke="${A}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M76 12 Q90 14 90 30 Q90 44 76 44" stroke="${A}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Star in cup -->
  <polygon points="50,28 53.5,38.5 64,38.5 55.5,44.5 58.5,55 50,49 41.5,55 44.5,44.5 36,38.5 46.5,38.5"
           fill="${A}" opacity="0.90"/>
  <!-- Sparkles -->
  <circle cx="14" cy="12" r="3"   fill="${A}" opacity="0.70"/>
  <circle cx="86" cy="12" r="3"   fill="${A}" opacity="0.70"/>
  <circle cx="8"  cy="44" r="2"   fill="${A}" opacity="0.50"/>
  <circle cx="92" cy="44" r="2"   fill="${A}" opacity="0.50"/>
  <circle cx="50" cy="4"  r="4"   fill="${A}"/>
</svg>`,

    // ── Gamification Reward: Medal with ribbon and stars ─────────────────────
    'gamification-reward': `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="106" viewBox="0 0 100 106" aria-hidden="true">
  <!-- Medal glow -->
  <circle cx="50" cy="70" r="32" fill="${A}" opacity="0.08"/>
  <!-- Ribbon left -->
  <path d="M34 12 L26 40 L44 34 L50 40 L44 14 Z" fill="${P}" opacity="0.70"/>
  <!-- Ribbon right -->
  <path d="M66 12 L74 40 L56 34 L50 40 L56 14 Z" fill="${P}" opacity="0.55"/>
  <!-- Medal body -->
  <circle cx="50" cy="70" r="28" fill="${bg}" stroke="${A}" stroke-width="2.5"/>
  <!-- Inner ring -->
  <circle cx="50" cy="70" r="22" fill="${A}" opacity="0.10" stroke="${A}" stroke-width="1.2"/>
  <!-- Central star -->
  <polygon points="50,52 54,64 66,64 57,72 60.5,84 50,77 39.5,84 43,72 34,64 46,64"
           fill="${A}" opacity="0.85"/>
  <!-- Ribbon top bar -->
  <rect x="34" y="10" width="32" height="6" rx="3" fill="${A}"/>
  <!-- Sparkles -->
  <circle cx="14" cy="26" r="3"   fill="${A}" opacity="0.65"/>
  <circle cx="86" cy="26" r="3"   fill="${A}" opacity="0.65"/>
  <circle cx="12" cy="62" r="2"   fill="${A}" opacity="0.45"/>
  <circle cx="88" cy="62" r="2"   fill="${A}" opacity="0.45"/>
  <circle cx="20" cy="90" r="2.5" fill="${A}" opacity="0.40"/>
  <circle cx="80" cy="90" r="2.5" fill="${A}" opacity="0.40"/>
  <circle cx="50" cy="4"  r="4"   fill="${A}"/>
</svg>`,
  };

  const svg = svgs[type];
  return `
<!--[if !mso]><!-->
<div style="text-align:center;margin:0 0 24px;mso-hide:all;" aria-hidden="true">
  ${svg}
</div>
<!--<![endif]-->`;
}
