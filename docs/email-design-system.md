# Siraja Email Design System

> Premium email identity for the Siraja Quran Learning Platform.
> Comparable to Stripe, Linear, and Apple — Islamic-first, Arabic RTL.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Design Tokens](#design-tokens)
3. [Brand Guidelines](#brand-guidelines)
4. [Component Library](#component-library)
5. [Template Catalogue](#template-catalogue)
6. [Accessibility](#accessibility)
7. [Dark Mode](#dark-mode)
8. [Compatibility Matrix](#compatibility-matrix)
9. [Developer Guide](#developer-guide)
10. [Customisation Guide](#customisation-guide)

---

## Design Philosophy

Every Siraja email should feel like it comes from a premium Islamic SaaS product — not a generic mailer. Three principles guide all decisions:

**Restraint** — every element earns its place. Generous whitespace, purposeful colour, and disciplined typography create calm and trust.

**Islamic identity** — the emerald + gold palette, the Cairo typeface, the Arabic RTL flow, and the Quranic verse in every footer root the product in its spiritual purpose without being decorative for decoration's sake.

**Maximum compatibility** — emails must render identically on a 2014 Outlook desktop and a 2025 iPhone 16. We use table-based layouts, inline CSS, MSO VML conditionals, and graceful CSS feature detection.

---

## Design Tokens

All tokens live in `backend/src/shared/email/brand/brand-config.ts` → `SIRAJA_COLORS`.

### Colour Palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#1A6B4A` | CTA buttons, headings, links, icon fills |
| `primaryDeep` | `#0d4a32` | Header gradient start, dark accents |
| `primaryLight` | `#22896a` | Header gradient end, hover hints |
| `accent` | `#C9A84C` | Gold decorative elements, dividers, borders |
| `accentDeep` | `#A87B28` | Pressed state, shadows on gold |
| `bgPage` | `#F8F7F3` | Email outer background, inner cards |
| `bgCard` | `#ffffff` | Email card body |
| `bgFooter` | `#F4F3EE` | Footer area |
| `bgInfoCard` | `#EEF7F2` | Info callout backgrounds |
| `bgWarnCard` | `#FEF3C7` | Warning callout backgrounds |
| `bgDangerCard` | `#FEE2E2` | Error callout backgrounds |
| `textPrimary` | `#1F2937` | Body text, strong emphasis |
| `textSecondary` | `#4B5563` | Standard paragraph text |
| `textMuted` | `#9CA3AF` | Timestamps, footnotes, meta |
| `textLink` | `#1A6B4A` | Inline links |
| `success` | `#16A34A` | Success states |
| `warning` | `#D97706` | Warning badges and callouts |
| `error` | `#DC2626` | Error states, security alerts |
| `border` | `#DDE6E0` | Card borders, separators |
| `borderLight` | `#EEF0EC` | Subtle inner dividers |

### Dark Mode Tokens

| Token | Hex | Replaces |
|---|---|---|
| `darkBgPage` | `#0d1a12` | `bgPage` |
| `darkBgCard` | `#111f17` | `bgCard` |
| `darkBgFooter` | `#091410` | `bgFooter` |
| `darkText` | `#D1FAE5` | `textPrimary` |
| `darkTextMuted` | `#9DC4B0` | `textMuted` |
| `darkHeading` | `#6EE7B7` | heading colours |
| `darkBgInfoCard` | `#14302A` | `bgInfoCard` |
| `darkBorder` | `#1E3A2A` | `border` |
| `darkLink` | `#6EE7B7` | `textLink` |

---

## Brand Guidelines

### Typography

**Primary:** Cairo (Google Fonts — loaded in `<head>` via `GOOGLE_FONTS_LINK`)  
**Fallback stack:** `'Noto Sans Arabic', Tahoma, 'Arial Unicode MS', Arial, sans-serif`

- Gmail strips `<link>` tags → Cairo doesn't load → Tahoma fallback is always applied in Gmail web. Tahoma is RTL-capable on Windows and looks excellent.
- **Never** use Traditional Arabic, Simplified Arabic, or any decorative Arabic web font — they are unavailable cross-platform.
- Body `line-height`: 1.9 (Arabic needs more breathing room than Latin text).
- Heading font size: 22px at weight 800.
- Body paragraph: 15px at weight 400.

### Logo

The Siraja logo is an octagonal Islamic lantern rendered as an inline SVG (`SIRAJA_LOGO_SVG` in `brand-config.ts`). It requires no external HTTP request and renders on every client including Outlook, ProtonMail, and Fastmail.

In the email header, the logo is wrapped in a **frosted glass circle** — a translucent `rgba(255,255,255,0.09)` circle with a gold border and a radial glow shadow. Outlook sees only the raw logo via MSO conditional fallback.

Tenant logos must be:
- An HTTPS URL (validated by `isSafeLogoUrl()`)
- Served from Cloudflare R2 or another CDN (no data: URIs)
- Displayed at 60×60px with `border-radius: 10px; object-fit: contain`

### Header

- Deep emerald linear gradient: `160deg, #0d4a32 → #1A6B4A → #22896a`
- Islamic geometric SVG band (8-pointed stars with gold lattice connectors)
- Frosted glass logo container
- Platform name in white Cairo 800 weight, 36px
- Gold tagline at 12.5px opacity 0.96
- Gold decorative divider
- Shimmer line at base of header

### Footer

- Cream background (`#F4F3EE`), 1px border above
- Quranic verse: ﴿ نُورٌ عَلَىٰ نُورٍ ﴾ — سورة النور آية ٣٥
- Gold ornamental divider
- Custom tenant social links (optional)
- Website + support email bar
- Privacy · Terms · Unsubscribe links
- Copyright line with optional `footerText`

---

## Component Library

All helpers are exported from `backend/src/shared/email/brand/brand-config.ts`.

### `getButtonHtml(opts)`

Generates an Outlook-safe CTA button using VML for MSO and a styled anchor for all other clients.

```typescript
getButtonHtml({
  href:         string,   // destination URL
  label:        string,   // button text (Arabic)
  primaryColor: string,   // background fill
  accentColor:  string,   // border stroke
  width?:       number,   // px (default: 240)
})
```

MSO renders a VML `<v:roundrect>`, all other clients render a CSS anchor with:
- `border-radius: 50px` (pill shape)
- Gradient background from `primaryColor`
- 2px gold border
- Box shadow for depth

### `getCardHtml(content, type?)`

Outlook-safe callout card with a coloured left border.

```typescript
getCardHtml(content: string, type?: 'info' | 'success' | 'warning' | 'danger')
```

Uses a narrow `<td>` left cell for the colour bar (works in Outlook without VML).

### `getCodeBoxHtml(code, primaryColor)`

Monospaced OTP / verification code display.

```typescript
getCodeBoxHtml(code: string, primaryColor: string)
```

Large `Courier New` font, 38px, letter-spacing 14px, dashed emerald border.

### `getEmailIllustration(type, primaryColor?, accentColor?)`

Returns a contextual inline SVG illustration wrapped in MSO conditionals.

```typescript
getEmailIllustration(
  type:         EmailIllustrationType,
  primaryColor?: string,
  accentColor?:  string,
)
```

Available types: `welcome`, `verification`, `otp`, `password-reset`, `notification`, `system-alert`, `invitation`, `weekly-summary`, `monthly-report`, `security-alert`, `achievement`, `gamification-reward`.

Outlook sees nothing (MSO conditional). Modern clients see a ~80–96px SVG centred at the top of the email body.

### `getSocialLinksHtml(links, primaryColor)`

Renders a row of pipe-separated text links in the footer.

```typescript
getSocialLinksHtml(
  links: { label: string; url: string }[],
  primaryColor: string,
)
```

### `getGeoPatternBand()`

Returns the Islamic geometric SVG ornament band used in the header. 8-pointed stars connected by diamond lattice connectors, gold at 30% opacity. MSO sees a thin gold fallback strip.

---

## Template Catalogue

| Template | Function | Key DTOs |
|---|---|---|
| Welcome | `welcomeEmailTemplate()` | `fullName`, `loginUrl`, `role?` |
| Email Verification | `verificationEmailTemplate()` | `fullName`, `verificationUrl`, `verificationCode?`, `expiresInHours?` |
| OTP | `otpEmailTemplate()` | `fullName`, `otpCode`, `expiresInMinutes?`, `purpose?` |
| Password Reset | `passwordResetEmailTemplate()` | `fullName`, `resetUrl`, `expiresInMinutes?`, `requestIp?` |
| Notification | `notificationEmailTemplate()` | `recipientName`, `title`, `message`, `type?`, `actionUrl?`, `actionLabel?` |
| System Alert | `systemAlertEmailTemplate()` | `severity`, `title`, `message`, `details?`, `timestamp` |
| Invitation | `invitationEmailTemplate()` | `inviteeName`, `inviterName`, `role?`, `inviteUrl`, `expiresInDays?`, `personalMessage?`, `academyName?` |
| Weekly Summary | `weeklySummaryEmailTemplate()` | `studentName`, `weekLabel`, `stats`, `topAchievement?`, `nextGoal?`, `dashboardUrl` |
| Monthly Report | `monthlyReportEmailTemplate()` | `studentName`, `monthLabel`, `summary`, `highlights?`, `reportUrl` |
| Security Alert | `securityAlertEmailTemplate()` | `fullName`, `alertType`, `details?`, `actionUrl?`, `actionLabel?` |
| Achievement | `achievementEmailTemplate()` | `studentName`, `achievementTitle`, `achievementDescription`, `achievementType?`, `points?`, `level?`, `dashboardUrl`, `shareUrl?` |
| Gamification Reward | `gamificationRewardEmailTemplate()` | `studentName`, `rewardTitle`, `rewardDescription`, `rewardType?`, `pointsEarned?`, `totalPoints?`, `badgeLevel?`, `rank?`, `dashboardUrl` |

### Sending via `EmailTemplateService`

```typescript
@Injectable()
class MyService {
  constructor(private readonly emailTemplate: EmailTemplateService) {}

  async notify(to: string) {
    await this.emailTemplate.sendWelcome(to, { fullName: 'أحمد', loginUrl: '...', ...brand });
    await this.emailTemplate.sendAchievement(to, { studentName: 'أحمد', ... });
    // etc.
  }
}
```

---

## Accessibility

All templates meet **WCAG 2.1 AA** contrast requirements:
- Primary on white: `#1A6B4A` / `#ffffff` → 5.8:1 ✅
- Body text on white: `#4B5563` / `#ffffff` → 7.0:1 ✅
- Muted text on white: `#9CA3AF` / `#ffffff` → 3.0:1 (AA large text) ✅
- Gold on dark header: `#C9A84C` / `#0d4a32` → 4.6:1 ✅

**Semantic HTML:**
- `<h1>` in header (brand name), `<h2>` in body (email title)
- `role="presentation"` on all layout tables
- `role="img"` and `aria-hidden="true"` on SVG illustrations
- `alt` text on all `<img>` tags

**Screen readers:**
- Inline SVG illustrations are hidden from assistive tech (`aria-hidden="true"`)
- All links have descriptive text, never "click here"
- Plain-text fallback included with every email

---

## Dark Mode

Two separate detection strategies are used simultaneously:

### Strategy 1: `@media (prefers-color-scheme: dark)`

Works in: Apple Mail (macOS/iOS), Samsung Mail, Outlook.com, Yahoo Mail, Proton Mail, Fastmail.

All background, text, border, and card colours are overridden using `!important` on classes defined in `<style>`.

### Strategy 2: `[data-ogsc]` attribute selector

Works in: Gmail web (Chrome, Firefox, Safari).

Gmail strips `@media` queries but preserves attribute selectors. The `[data-ogsc]` attribute is injected by Gmail when dark mode is enabled.

**Header** — always dark (emerald gradient), so no inversion is needed in either mode.

**What adapts:**
- Page background → `#0d1a12`
- Card body → `#111f17`
- Text → `#D1FAE5`
- Headings → `#6EE7B7`
- Links → `#6EE7B7`
- Inner cards → `#14302A`
- Footer → `#091410`
- Borders → `#1E3A2A`

---

## Compatibility Matrix

| Client | HTML | Dark Mode | Animation | SVG Illustrations |
|---|---|---|---|---|
| Apple Mail (macOS) | ✅ | ✅ `@media` | ✅ | ✅ |
| Apple Mail (iOS) | ✅ | ✅ `@media` | ✅ | ✅ |
| Gmail Web (Chrome) | ✅ | ✅ `[data-ogsc]` | ❌ (ignored) | ✅ |
| Gmail App (Android) | ✅ | ❌ (not supported) | ❌ | ✅ |
| Gmail App (iOS) | ✅ | ❌ | ❌ | ✅ |
| Outlook 2016-2021 | ✅ VML | ❌ | ❌ | ❌ (MSO fallback) |
| Outlook.com | ✅ | ✅ `@media` | ❌ | ✅ |
| Outlook Mobile | ✅ | ❌ | ❌ | ✅ |
| Yahoo Mail | ✅ | ✅ `@media` | ❌ | ✅ |
| Samsung Mail | ✅ | ✅ `@media` | ✅ | ✅ |
| Proton Mail | ✅ | ✅ `@media` | ❌ | ✅ |
| Fastmail | ✅ | ✅ `@media` | ❌ | ✅ |
| Thunderbird | ✅ | ✅ `@media` | ❌ | ✅ |

**Animations** are CSS `@keyframes` applied to `.email-card`. They are fully safe to include — clients that don't support them render the email statically (no broken layout).

**SVG illustrations** are wrapped in `<!--[if !mso]><!-->...<!--<![endif]-->` conditionals so Outlook never attempts to render them (which would produce red broken-image boxes).

---

## Developer Guide

### Regenerating previews

```bash
cd backend
npm run email:preview
```

This runs `scripts/generate-email-previews.ts` which renders all 21 preview HTML files plus `index.html` into `email-previews/`.

### Adding a new template

1. Create `backend/src/shared/email/templates/my-template.template.ts`
2. Export `MyTemplateData extends BaseTemplateData` and `myEmailTemplate(data): { subject, html, text }`
3. Use `getEmailIllustration()` for the illustration (add a new type if needed)
4. Add a `sendMyTemplate()` method to `EmailTemplateService`
5. Add a preview case to `scripts/generate-email-previews.ts`
6. Run `npm run email:preview` to verify

### Resolving brand data

```typescript
// In a use case or service:
const brand = this.emailBrandService.resolve(tenantBranding ?? null);
const { html, subject, text } = welcomeEmailTemplate({
  ...brand,
  fullName,
  loginUrl,
});
await this.emailTemplateService.sendWelcome(user.email, { ...brand, fullName, loginUrl });
```

`emailBrandService.resolve(null)` always returns valid Siraja platform defaults.

### Template anatomy

```typescript
import { baseEmailTemplate, BaseTemplateData } from './base.template';
import { getEmailIllustration, getButtonHtml, SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from '../brand/brand-config';

export interface MyTemplateData extends BaseTemplateData {
  // your additional fields
}

export function myEmailTemplate(data: MyTemplateData): { subject: string; html: string; text: string } {
  const { primaryColor = SIRAJA_BRAND_DEFAULTS.primaryColor, accentColor = SIRAJA_BRAND_DEFAULTS.accentColor } = data;

  const illustration = getEmailIllustration('notification', primaryColor, accentColor);
  const headingRule  = `<div style="width:48px;height:3px;background:${accentColor};background:linear-gradient(to left,transparent,${accentColor},${primaryColor});border-radius:2px;margin:0 0 22px;"></div>`;

  const body = `
    ${illustration}
    <h2 style="color:${primaryColor};font-size:22px;font-weight:700;margin:0 0 6px;font-family:'Cairo',Tahoma,Arial,sans-serif;">
      عنوان البريد
    </h2>
    ${headingRule}
    <!-- body content -->
  `;

  return {
    subject: 'موضوع البريد',
    html:    baseEmailTemplate(body, data),
    text:    'نسخة النص العادي',
  };
}
```

---

## Customisation Guide

### Tenant overrides via `EmailBrandService`

Pass a `TenantBrandingInput` object to `emailBrandService.resolve()`:

```typescript
const brand = this.emailBrandService.resolve({
  name:        'دار الحفاظ',
  tagline:     'حلقات القرآن الكريم',
  logoUrl:     'https://cdn.daralhuffaz.com/logo.png',  // HTTPS only
  colors: {
    primary: '#1B4F8A',   // custom blue
    accent:  '#D4A84B',   // custom gold
  },
  supportEmail: 'info@daralhuffaz.com',
  customDomain: 'app.daralhuffaz.com',
  socialLinks: [
    { label: 'الموقع الرسمي', url: 'https://daralhuffaz.com' },
    { label: 'تويتر',        url: 'https://twitter.com/daralhuffaz' },
  ],
  footerText: 'أكاديمية دار الحفاظ — المملكة العربية السعودية',
});
```

Any field not provided falls back to the Siraja platform defaults automatically.

### Fields that can be overridden per tenant

| Field | Type | Effect |
|---|---|---|
| `name` | `string` | Platform name in header and footer |
| `tagline` | `string` | Subtitle under the logo in the header |
| `logoUrl` | `string` | Logo image (HTTPS CDN URL). Absent → Siraja SVG |
| `colors.primary` | `string` | Heading, button, link, accent bar colour |
| `colors.accent` | `string` | Gold decorative elements, button border |
| `supportEmail` | `string` | Support email in footer and callout cards |
| `customDomain` | `string` | Base URL for website link (protocol-free, e.g. `app.example.com`) |
| `socialLinks` | `{ label, url }[]` | Extra link row in footer |
| `footerText` | `string` | Custom notice below the copyright line |

### Logo requirements

- Must be served over HTTPS
- Recommended: square, 120×120px minimum, PNG or WebP
- Displayed at 60×60px in the email header
- Invalid / non-HTTPS URLs fall back to the Siraja SVG silently

### Template-level overrides

Any `BaseTemplateData` field can also be set per-email-send without going through `EmailBrandService`:

```typescript
await this.emailTemplateService.sendWelcome(to, {
  ...brand,
  primaryColor: '#9B2335',  // one-off override for this email only
  preheader: 'Custom inbox preview text',
});
```
