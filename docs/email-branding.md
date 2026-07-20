# Siraja Email Branding System

> Design concept: **"ضوء السراج"** — the warm glow of a lantern illuminating the path of Quran memorisation.

---

## Table of Contents

1. [Overview](#overview)
2. [Visual Identity](#visual-identity)
3. [File Structure](#file-structure)
4. [Template Catalogue](#template-catalogue)
5. [Dark Mode Support](#dark-mode-support)
6. [Tenant-Aware Branding](#tenant-aware-branding)
7. [Arabic Typography](#arabic-typography)
8. [EmailBrandService API](#emailbrandservice-api)
9. [Adding a New Template](#adding-a-new-template)
10. [Generating Previews](#generating-previews)
11. [Email Client Compatibility](#email-client-compatibility)
12. [Design Guidelines](#design-guidelines)

---

## Overview

All outbound emails from Siraja are rendered through a centralized branding system.
The system provides:

- **One source of truth** for colors, logo, fonts, and footer content
- **Tenant-aware rendering** — a tenant's custom logo and colors override Siraja defaults
- **Dark-mode aware** — CSS media queries + Gmail `[data-ogsc]` attribute selectors
- **Zero external image dependencies** for the default brand — the official Siraja logo is an inline SVG
- **Full Arabic RTL** layout with Cairo typeface
- **Responsive** — collapses cleanly at ≤ 620 px

---

## Visual Identity

### Color Palette

| Token            | Light Mode | Dark Mode  | Usage                             |
|------------------|-----------|------------|-----------------------------------|
| `primary`        | `#1A6B4A` | `#7ecba1`  | Header gradient, headings, CTAs   |
| `primaryDeep`    | `#0d4a32` | —          | Header gradient start, button bg  |
| `primaryLight`   | `#22896a` | —          | Header gradient end               |
| `accent`         | `#C9A84C` | `#C9A84C`  | Geometric strips, dividers, OTP   |
| `accentDeep`     | `#A87B28` | —          | Logo collar detail                |
| `bgPage`         | `#EFF5F1` | `#0d1f15`  | Outer wrapper background          |
| `bgCard`         | `#ffffff`  | `#122318`  | Email card background             |
| `bgFooter`       | `#f7f9f8`  | `#0a1910`  | Footer background                 |
| `bgInfoCard`     | `#f0faf5`  | `#1a3226`  | Informational callout cards       |
| `bgWarnCard`     | `#fff8e6`  | `#2a2010`  | Warning callout cards             |
| `bgDangerCard`   | `#fff0f0`  | `#2a1010`  | Critical/danger callout cards     |

All color constants live in `backend/src/shared/email/brand/brand-config.ts` → `SIRAJA_COLORS`.

### Official Logo

| Property | Value |
|---|---|
| **Source file** | `backend/src/shared/email/brand/siraja-logo.svg` |
| **Design** | Islamic hanging lantern (فانوس) — octagonal body, suspension ring, side decorative rings, warm amber glow |
| **Dimensions** | `viewBox="0 0 80 96"`, rendered at `52 × 62 px` in emails |
| **Color** | Gold `#C9A84C` stroke + amber `#FCD34D` glow on transparent background |
| **Usage in email** | Inline SVG (no HTTP request, works in all clients including offline Outlook) |
| **Tenant override** | When `TenantBranding.logoUrl` is set, an `<img>` tag replaces the SVG |

```
Email header structure:
┌─────────────────────────────────────┐
│  ████ gold top strip (5px)          │
│                                     │
│   ◆ ◆ ◆ ◆  geometric pattern        │
│                                     │
│       🪔  Siraja lantern SVG         │
│                                     │
│          سِـراج   (36px/800w)        │
│   ✦ منصة حفظ القرآن الكريم الذكية ✦  │
│          ──────── gold divider       │
│                                     │
│  ░░░░ gradient gold bottom line     │
└─────────────────────────────────────┘
```

### Typography

```css
font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, 'Arial Unicode MS', Arial, sans-serif;
```

- **Cairo** (Google Fonts) — primary face. Excellent Arabic + Latin coverage. Loaded via `<link>` in `<head>`; stripped by Gmail but honored by Apple Mail, Yahoo, Samsung Mail.
- **Noto Sans Arabic** — universal fallback on Android/Linux.
- **Segoe UI / Tahoma** — Windows fallback; Outlook renders these reliably.
- **Arial Unicode MS / Arial** — last-resort for all clients.

Outlook ignores `<link>` tags. It falls back to Tahoma, which is fully RTL-capable.

---

## File Structure

```
backend/src/shared/email/
├── brand/
│   ├── siraja-logo.svg          ← Official logo (canonical SVG source)
│   ├── brand-config.ts          ← Colors, font stack, logo markup factory, Google Fonts links
│   ├── email-brand.service.ts   ← NestJS service: resolves tenant-aware BaseTemplateData
│   └── index.ts                 ← Public barrel export
│
├── templates/
│   ├── base.template.ts         ← HTML shell (header, body slot, footer; dark mode CSS)
│   ├── welcome.template.ts
│   ├── verification.template.ts
│   ├── password-reset.template.ts
│   ├── notification.template.ts
│   └── system-alert.template.ts
│
├── email-template.service.ts    ← High-level sendWelcome/sendVerification/… (NestJS service)
├── email.module.ts              ← @Global module; exports EMAIL_PROVIDER, EmailTemplateService, EmailBrandService
├── email-provider.interface.ts
├── providers/
│   └── smtp-email.provider.ts
└── email.templates.spec.ts

backend/scripts/
└── generate-email-previews.ts   ← CLI script: renders all 11 templates to email-previews/

email-previews/                  ← Generated HTML files (open in browser to preview)
├── index.html                   ← Gallery index (open this)
├── welcome.html
├── verification.html
├── verification-with-otp.html
├── password-reset.html
├── notification-info.html
├── notification-success.html
├── notification-warning.html
├── system-alert-info.html
├── system-alert-warning.html
├── system-alert-critical.html
└── tenant-branded.html          ← Same as welcome but with tenant palette override
```

---

## Template Catalogue

### 1. Welcome (`welcome.template.ts`)

**Subject:** `🌟 مرحباً بك في ${tenantName} — حسابك جاهز!`

Sent when a new user's account is activated. Contains:
- Personalised greeting with `fullName`
- Feature list (memorisation tracking, sheikh feedback, AI assistant, leaderboards)
- Primary CTA: "ابدأ رحلتك مع القرآن" → `loginUrl`
- Du'aa closing

**Key data fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `fullName` | string | ✓ | Recipient's display name |
| `loginUrl` | string | ✓ | Deep link to the app login |
| `role` | string | — | `'student'` / `'sheikh'` / … (unused visually, reserved) |

---

### 2. Email Verification (`verification.template.ts`)

**Subject:** `✉️ تأكيد بريدك الإلكتروني — ${tenantName}`

Sent after registration to verify the email address. Supports two modes:

- **Link only** — a full magic-link button + fallback URL
- **Link + OTP** — same plus a large code box (`verificationCode`)

**Key data fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `fullName` | string | ✓ | Recipient's display name |
| `verificationUrl` | string | ✓ | Token-embedded verification URL |
| `verificationCode` | string | — | 6-digit OTP (displayed in large code box) |
| `expiresInHours` | number | — | Link validity; default `24` |

---

### 3. Password Reset (`password-reset.template.ts`)

**Subject:** `🔐 إعادة تعيين كلمة المرور — ${tenantName}`

Sent when a user requests a password reset.

**Key data fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `fullName` | string | ✓ | Recipient's display name |
| `resetUrl` | string | ✓ | Token-embedded reset URL |
| `expiresInMinutes` | number | — | Link validity; default `60` |
| `requestIp` | string | — | IP address of the reset request (shown in warn card) |

---

### 4. Notification (`notification.template.ts`)

**Subject:** `${icon} ${title} — ${tenantName}`

Generic purpose notification — three severity variants:

| `type` | Card class | Icon |
|---|---|---|
| `'info'`    | `.info-card` (green)  | 📢 |
| `'success'` | `.info-card` (green)  | ✅ |
| `'warning'` | `.warn-card` (amber)  | ⚠️ |

**Key data fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `recipientName` | string | ✓ | Recipient's display name |
| `title` | string | ✓ | Email subject title |
| `message` | string | ✓ | Inner HTML for the card (may contain `<br/>`, `<strong>`) |
| `type` | `'info'`/`'success'`/`'warning'` | — | Card style |
| `actionUrl` | string | — | Optional CTA button URL |
| `actionLabel` | string | — | CTA label; default `'عرض التفاصيل'` |

---

### 5. System Alert (`system-alert.template.ts`)

**Subject:** `${severityIcon} ${title}`

Operational alert sent to platform admins. Three severity levels with distinct badge colors:

| `severity` | Badge color | Label |
|---|---|---|
| `'info'`     | Blue `#3B82F6`   | معلومات |
| `'warning'`  | Amber `#F59E0B`  | تحذير |
| `'critical'` | Red `#EF4444`    | حرج |

**Key data fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `severity` | `'info'`/`'warning'`/`'critical'` | ✓ | Alert level |
| `title` | string | ✓ | Alert title |
| `message` | string | ✓ | Description of the alert |
| `details` | `Record<string, string\|number\|boolean>` | — | Key-value table rendered below the message |
| `timestamp` | string | ✓ | When the alert was triggered |

---

## Dark Mode Support

The email shell implements three layers of dark-mode adaptation:

### Layer 1 — `@media (prefers-color-scheme: dark)`
Works in: Apple Mail (macOS + iOS), Samsung Mail, Outlook.com, Yahoo Mail.

Key overrides:
- Page background: `#EFF5F1` → `#0d1f15`
- Card background: `#ffffff` → `#122318`
- Body text: `#2d2d2d` → `#e0ebe3`
- Heading color: `#1A6B4A` → `#7ecba1`
- Info card background: `#f0faf5` → `#1a3226`
- Code/OTP box: light green gradient → dark green `#1a3226`

### Layer 2 — `[data-ogsc]` attribute selectors (Gmail dark mode)
Gmail web in dark mode applies a `data-ogsc` attribute to the `<body>`.
Duplicate rules using `[data-ogsc] .classname` syntax force the override through Gmail's CSS sanitizer.

### Layer 3 — What stays the same
The **header** already uses a deep emerald gradient (`#0d4a32 → #1A6B4A`) — it looks identical in light and dark mode.
The **logo** is gold on dark green — no inversion needed.
The **footer** Quranic verse switches to `#7ecba1` (lighter green) in dark mode.

---

## Tenant-Aware Branding

### How it works

When a tenant has custom branding configured in `TenantBranding` (MongoDB collection `tenant_branding`), callers pass the relevant fields to `EmailBrandService.resolve()`:

```typescript
// In any use-case or service that sends emails:
const tenantBranding = await this.tenantBrandingRepo.findByTenantId(tenantId);
const brand = this.emailBrandService.resolve(tenantBranding ? {
  name:         tenant.name,
  logoUrl:      tenantBranding.logoUrl,
  colors:       tenantBranding.colors,
  supportEmail: tenantBranding.supportEmail,
  customDomain: tenantBranding.customDomain,
  tagline:      tenantBranding.tagline,
} : null);

const { html, subject, text } = welcomeEmailTemplate({ ...brand, fullName, loginUrl });
await this.emailTemplateService.sendWelcome(to, { ...brand, fullName, loginUrl });
```

### Tenant logo rendering

| Condition | Rendered HTML |
|---|---|
| `tenantBranding.logoUrl` is set | `<img src="[logoUrl]" width="60" height="60" style="border-radius:8px;object-fit:contain;"/>` |
| No tenant logo (or Siraja platform email) | Official Siraja inline SVG lantern |

> **Logo URL requirements:** Must be an HTTPS URL to a publicly-accessible image (Cloudflare R2 public bucket, CDN). Use `EmailBrandService.isSafeLogoUrl(url)` to validate before passing it in. Recommended formats: PNG or SVG. Recommended size: at least 120×120 px (rendered at 60×60 with `object-fit: contain`).

### Branding fields

| `TenantBrandingInput` field | Fallback |
|---|---|
| `name` | `'سراج'` |
| `logoUrl` | Siraja inline SVG |
| `tagline` | `'✦ منصة حفظ القرآن الكريم الذكية ✦'` |
| `colors.primary` | `#1A6B4A` |
| `colors.accent` | `#C9A84C` |
| `supportEmail` | `support@siraja.website` |
| `customDomain` | `https://siraja.website` |

---

## Arabic Typography

All emails are set `dir="rtl"` with `lang="ar"`. Key decisions:

| Decision | Rationale |
|---|---|
| Cairo via Google Fonts `<link>` | Best Arabic/Latin coverage; free; subset loaded on demand |
| System fallback chain (`Noto Sans Arabic → Segoe UI → Tahoma → Arial Unicode MS`) | Covers Android, Windows, iOS, macOS offline |
| `line-height: 1.9` | Arabic text needs more breathing room than Latin; 1.9 prevents ascender/descender collision in Gmail |
| `font-weight: 700–800` for headings | Cairo's heavier weights are exceptionally clear on screen |
| OTP/code box: `font-family: 'Courier New', monospace; direction: ltr` | Digits must render LTR with fixed spacing; monospace avoids digit-width jitter in Outlook |
| `mso-table-lspace/rspace: 0pt` reset | Prevents Outlook from adding phantom spacing in table cells |

---

## EmailBrandService API

```typescript
import { EmailBrandService, TenantBrandingInput } from '@shared/email/brand';

// Injectable — available globally via EmailModule (@Global)
@Injectable()
class MyService {
  constructor(private readonly emailBrand: EmailBrandService) {}

  async example(tenantBranding?: TenantBrandingInput) {
    // Resolve brand (tenant override or Siraja defaults)
    const brand = this.emailBrand.resolve(tenantBranding ?? null);
    // brand: BaseTemplateData { tenantName, primaryColor, accentColor, ... }

    // Validate a tenant logo URL before passing it in
    const safeUrl = EmailBrandService.isSafeLogoUrl(tenantBranding?.logoUrl)
      ? tenantBranding!.logoUrl
      : undefined;
  }
}
```

### `resolve(tenantBranding?: TenantBrandingInput | null): BaseTemplateData`

Merges optional tenant overrides with Siraja defaults. Any falsy tenant value falls back to the platform default.

### `EmailBrandService.isSafeLogoUrl(url?: string): boolean` (static)

Returns `true` only for valid HTTPS URLs. Use before rendering tenant logos in email.

### `EmailBrandService.colorVars(primary: string, accent: string): string` (static)

Returns a CSS custom-properties string — useful for inline style generation in future template extensions.

---

## Adding a New Template

1. Create `backend/src/shared/email/templates/my-feature.template.ts`
2. Import `baseEmailTemplate` and `BaseTemplateData` from `./base.template`
3. Extend `BaseTemplateData` with your data interface
4. Return `{ subject, html: baseEmailTemplate(body, data), text }`
5. Add a `sendMyFeature()` method to `EmailTemplateService`
6. Add a preview case in `backend/scripts/generate-email-previews.ts`

```typescript
import { baseEmailTemplate, BaseTemplateData } from './base.template';

export interface MyFeatureTemplateData extends BaseTemplateData {
  userName: string;
  actionUrl: string;
}

export function myFeatureEmailTemplate(data: MyFeatureTemplateData): {
  subject: string; html: string; text: string;
} {
  const { userName, actionUrl, tenantName = 'سراج' } = data;
  const subject = `✨ ${userName} — ${tenantName}`;
  const body = `
    <h2>مرحباً ${userName}!</h2>
    <div class="btn-wrap">
      <a href="${actionUrl}" class="btn">اتخاذ إجراء</a>
    </div>
  `;
  const text = `مرحباً ${userName}،\n\n${actionUrl}`;
  return { subject, html: baseEmailTemplate(body, data), text };
}
```

**Available CSS classes in `body`:**

| Class | Usage |
|---|---|
| `.btn-wrap` + `.btn` | Primary CTA button (pill shape) |
| `.code-box` | Large OTP/code display |
| `.info-card` | Green informational callout |
| `.warn-card` | Amber warning callout |
| `.danger-card` | Red critical callout |
| `.feature-list` | `<ul>` with gold `✦` bullets |
| `.section-divider` | Horizontal `<hr>` |
| `.link-fallback` | Small grey URL fallback below buttons |

---

## Generating Previews

```bash
# From repo root:
cd backend
npx ts-node -P tsconfig.json --require tsconfig-paths/register scripts/generate-email-previews.ts

# Output: email-previews/ (12 HTML files + index gallery)
# Open in browser:
open ../email-previews/index.html
```

The preview script is idempotent — re-run any time templates change.

### Preview inventory

| File | Template | Notes |
|---|---|---|
| `welcome.html` | Welcome | Standard Siraja branding |
| `verification.html` | Verification | Link only |
| `verification-with-otp.html` | Verification | Link + OTP code box |
| `password-reset.html` | Password Reset | With IP warn card |
| `notification-info.html` | Notification | Info type |
| `notification-success.html` | Notification | Success type |
| `notification-warning.html` | Notification | Warning type |
| `system-alert-info.html` | System Alert | Info severity |
| `system-alert-warning.html` | System Alert | Warning severity |
| `system-alert-critical.html` | System Alert | Critical severity |
| `tenant-branded.html` | Welcome | "دار الحفاظ" custom palette (royal blue + gold) |
| `index.html` | — | Gallery navigation |

---

## Email Client Compatibility

| Client | Light | Dark | RTL | Cairo Font | Notes |
|---|---|---|---|---|---|
| Gmail (web) | ✅ | ✅* | ✅ | ❌ (stripped) | `[data-ogsc]` dark mode; falls back to system font |
| Gmail (Android) | ✅ | ✅* | ✅ | ❌ | Same as web |
| Apple Mail (macOS) | ✅ | ✅ | ✅ | ✅ | Full `@media` dark mode + Cairo |
| Apple Mail (iOS) | ✅ | ✅ | ✅ | ✅ | Full `@media` dark mode + Cairo |
| Outlook 2016-2021 | ✅ | ❌ | ✅ | ❌ (Tahoma) | MSO conditional tags handle table spacing |
| Outlook.com | ✅ | ✅ | ✅ | ✅ | Respects `@media` dark mode |
| Yahoo Mail | ✅ | ✅ | ✅ | ✅ | |
| Samsung Mail | ✅ | ✅ | ✅ | ✅ | |

\* Gmail dark mode: overrides applied via `[data-ogsc]` attribute selectors.

---

## Design Guidelines

### Do ✅
- Keep email width at 600 px max — do not widen the container
- Use `.info-card`, `.warn-card`, or `.danger-card` for highlighted content — never bare `<div>` with inline styles
- Use the `.btn` class for all primary CTAs — the pill shape and shadow are intentional
- Pass `fullName` from the actual user record — never use the email prefix as a name in production
- Use `tenantName` everywhere the brand appears — never hardcode "سراج" in individual templates
- Use `EmailBrandService.isSafeLogoUrl()` before passing tenant logos to templates
- Keep the plain-text `text` field in sync with the HTML content — it's used by screen readers and some clients

### Don't ❌
- Don't use external images for brand assets — the Siraja SVG is inline for a reason
- Don't add JavaScript — all email clients block it
- Don't use CSS Grid or Flexbox in the main layout — Outlook doesn't support them (they're safe inside `.email-body` text areas, but not for the structural layout)
- Don't use `position: absolute/fixed` — email clients ignore it
- Don't use system-specific Arabic fonts (e.g. `Traditional Arabic`, `Simplified Arabic`) — they're unavailable cross-platform
- Don't hardcode `support@siraja.website` in individual templates — read it from `data.supportEmail`

### Color Usage
- **Emerald `#1A6B4A`** — primary brand color; for headings, links, CTA buttons, border accents
- **Gold `#C9A84C`** — accent only; for decorative strips, OTP box border, bullet points, tagline
- **Never use gold as a primary text color** — contrast ratio is insufficient on white backgrounds
- **For error states** use red `#e53e3e` (danger card border) — not gold
