# Siraja Email Design System
## Premium Edition — Enterprise Grade

---

## Overview

The Siraja Email Design System delivers a **world-class email experience** comparable to Stripe, Notion, Linear, and Apple — built for Arabic-first, RTL content, cross-client compatibility, and Quran-centred branding.

Every email shares a single cohesive design language: premium Islamic geometric art, radiant gradients, Cairo typography, gold accent system, and a Quran verse footer.

---

## Design Tokens

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#1A6B4A` | Brand emerald — headings, buttons, links |
| `primaryDeep` | `#0d4a32` | Header gradient dark stop |
| `primaryLight` | `#22896a` | Header gradient light stop |
| `primaryMid` | `#155c3e` | Header gradient mid tone |
| `accent` | `#C9A84C` | Gold — dividers, decorations, chips |
| `accentDeep` | `#A87B28` | Gold dark — caps, rings |
| `accentLight` | `#E2C472` | Gold light — shimmer effects |
| `bgPage` | `#F8F7F3` | Warm off-white outer background |
| `bgCard` | `#ffffff` | Email body card background |
| `bgFooter` | `#F4F3EE` | Footer zone background |
| `textPrimary` | `#1F2937` | Body text — charcoal |
| `textSecondary` | `#4B5563` | Paragraph text |
| `textMuted` | `#9CA3AF` | Footnotes, metadata |
| `border` | `#DDE6E0` | Footer dividers |
| `borderLight` | `#EEF0EC` | Inner card borders, separators |

### Dark Mode Palette

| Token | Hex |
|---|---|
| `darkBgPage` | `#0a1a11` |
| `darkBgCard` | `#0f1e16` |
| `darkBgFooter` | `#081310` |
| `darkText` | `#D1FAE5` |
| `darkTextMuted` | `#9DC4B0` |
| `darkHeading` | `#6EE7B7` |
| `darkLink` | `#6EE7B7` |
| `darkBorder` | `#1a3828` |

### Typography

```
Font family: 'Cairo', 'Noto Sans Arabic', Tahoma, 'Arial Unicode MS', Arial, sans-serif
Weights:     400 (regular) · 500 · 600 · 700 · 800 · 900
Source:      Google Fonts — preconnect optimised, loaded via <link>
Fallback:    Tahoma → Arial Unicode MS → Arial (covers Outlook where Google Fonts fail)
```

| Use | Size | Weight |
|---|---|---|
| Brand name (h1) | 38px | 900 |
| Section heading (h2) | 23px | 800 |
| Body paragraph | 15px | 400 |
| List item | 14px | 400 |
| Footer body | 13px | 400 |
| Label / meta | 11–12px | 500–700 |
| Stat value | 24–26px | 900 |

---

## Component Library

### 1. Email Shell (`baseEmailTemplate`)

The outer container rendered by every template.

**Structure:**
```
outer-wrapper (table, full-width, bgPage background)
  └── email-card (max-width:600px, 20px border-radius, shadow)
        ├── gold top accent bar (4px, gradient)
        ├── header (radial gradient + geometric band + logo + name + tagline + divider)
        ├── body (44px/48px padding, template-specific content)
        └── footer (Quran verse + social + contact + policy + copyright)
```

**Header anatomy:**
- Radial gradient: `radial-gradient(ellipse at 50% 0%, hdrLight 0%, hdrMid 40%, hdrDeep 100%) + linear-gradient`
- Islamic geometric SVG band: 8-pointed stars with diamond nodes (opacity 0.35, Outlook receives gold strip)
- Logo: frosted glass circle (`rgba(255,255,255,0.08)` + gold border + glow shadow) containing inline SVG lantern or tenant `<img>`
- Brand name: 38px/900 white, text-shadow for depth
- Tagline: gold accent, 13px
- Decorative divider: diamond ◆ nodes with gradient lines + shimmer border

**Footer anatomy:**
- Ornamental divider (5-segment: fade–diamond–bar–diamond–fade)
- Quranic verse: ﴿ نُورٌ عَلَىٰ نُورٍ ﴾ (سورة النور — ٣٥)
- Social link row (tenant-configurable)
- Website 🌐 + Support ✉ links
- Policy links (Privacy · Terms · Unsubscribe)
- Copyright + optional tenant footer text

### 2. Lantern Logo (`SIRAJA_LOGO_SVG`)

Premium Islamic lantern — octagonal glass body with glowing light core:
- Chain + hanging ring
- Gold top cap + decorative ring
- Octagonal body with lattice lines (horizontal, vertical, diagonal)
- 3-layer glow core (ellipses + circle)
- Light rays emanating from core
- Bottom cap + drip + base circle
- Side accent rings

Dimensions: 58×72px viewBox 0 0 80 100. Inline SVG = zero HTTP requests.

### 3. Geometric Header Band (`getGeoPatternBand`)

Full-width SVG ornament band (600×52px, opacity 0.35):
- Top/bottom decorative thin lines
- 8-pointed stars with 4-pointed inner fill
- Connected by diamond nodes with gradient connector lines
- Accent dashes above/below connectors
- Outlook fallback: 3px gold solid strip

### 4. Pill-Gradient Button (`getButtonHtml`)

Cross-client pill button with full Outlook VML support:

```ts
getButtonHtml({
  href:         string;      // destination URL
  label:        string;      // button text
  primaryColor: string;      // fill colour
  accentColor:  string;      // border colour
  width?:       number;      // default 240px
  variant?:     'primary' | 'danger' | 'success';  // default 'primary'
})
```

**Modern clients:** CSS pill — `border-radius:50px`, gradient fill, gold border, box-shadow, hover animation
**Outlook:** `<v:roundrect>` VML with `arcsize="50%"` — renders as a rounded rectangle

### 5. Premium Cards (`getCardHtml`)

Left-border accent card with soft background:

```ts
getCardHtml(content: string, type: 'info' | 'success' | 'warning' | 'danger')
```

| Type | Border | Background |
|---|---|---|
| info | `#1A6B4A` | `#EEF7F2` |
| success | `#16A34A` | `#DCFCE7` |
| warning | `#D97706` | `#FFFBEB` |
| danger | `#DC2626` | `#FEF2F2` |

5px left accent strip + 12px border-radius + subtle shadow. Outlook-safe table layout.

### 6. OTP Code Box (`getCodeBoxHtml`)

Prominent monospace code display:
- Gradient background (`primaryColor 0a → 18`)
- Dashed border with rounded corners (16px)
- 40px monospace, 18px letter-spacing, font-weight 900
- Inset shadow for depth

### 7. Stat Grid

2×3 icon + value + label grid. Used by weekly summary and monthly report.

```ts
getStatBoxHtml(stats: Array<{ label: string; value: string | number }>)
```

- `bgPage` background, 16px radius, subtle shadow
- `stat-value`: 26px / weight 900 / primaryColor
- `stat-label`: 11px / muted / uppercase
- Horizontal divider between rows

### 8. Social Links (`getSocialLinksHtml`)

```ts
getSocialLinksHtml(links: SocialLink[], primaryColor: string)
```

```ts
interface SocialLink {
  label: string;
  url:   string;
  icon?: string;  // emoji shown before label
}
```

Renders as inline `<a>` elements separated by · dots.

### 9. SVG Illustrations (`getEmailIllustration`)

Per-template premium inline SVG (no external resources):

| Type | Illustration | Key Elements |
|---|---|---|
| `welcome` | Open Quran book | Radiant light rays, golden stars, text lines |
| `verification` | Shield + checkmark | Trust rings, gold accent dots |
| `otp` | Lock + keyhole | Sparkle circles, shackle |
| `password-reset` | Key + rings | Key teeth, arrow hint, sparkles |
| `notification` | Bell + ripples | Notification dot, clapper |
| `system-alert` | Server rack | 3 servers, alert badge |
| `invitation` | Open doorway | Golden light beam, welcome path |
| `weekly-summary` | Bar chart | Trend line with dots, up arrow |
| `monthly-report` | Calendar | Achievement highlight dots, ring posts |
| `security-alert` | Shield + exclamation | Red accent, urgency dots |
| `achievement` | Trophy + star | Cup handles, star polygon, sparkles |
| `gamification-reward` | Medal + ribbon | Badge star, ribbon panels |

All wrapped in `<!--[if !mso]><!-- ... --><![endif]-->` so Outlook skips them cleanly.

---

## Template Catalogue

| Template | Function | Key Data Fields |
|---|---|---|
| Welcome | `welcomeEmailTemplate` | `fullName`, `loginUrl`, `role?` |
| Verification | `verificationEmailTemplate` | `fullName`, `verificationUrl`, `verificationCode?`, `expiresInHours?` |
| OTP | `otpEmailTemplate` | `fullName`, `otpCode`, `expiresInMinutes?`, `purpose?` |
| Password Reset | `passwordResetEmailTemplate` | `fullName`, `resetUrl`, `expiresInMinutes?`, `requestIp?` |
| Notification | `notificationEmailTemplate` | `recipientName`, `title`, `message`, `type?`, `actionUrl?`, `actionLabel?` |
| System Alert | `systemAlertEmailTemplate` | `severity`, `title`, `message`, `details?`, `timestamp` |
| Invitation | `invitationEmailTemplate` | `inviteeName`, `inviterName`, `role?`, `inviteUrl`, `expiresInDays?`, `personalMessage?`, `academyName?` |
| Weekly Summary | `weeklySummaryEmailTemplate` | `studentName`, `weekLabel`, `stats`, `topAchievement?`, `nextGoal?`, `dashboardUrl` |
| Monthly Report | `monthlyReportEmailTemplate` | `studentName`, `monthLabel`, `summary`, `highlights?`, `reportUrl` |
| Security Alert | `securityAlertEmailTemplate` | `fullName`, `alertType`, `details?`, `actionUrl?`, `actionLabel?` |
| Achievement | `achievementEmailTemplate` | `studentName`, `achievementTitle`, `achievementDescription`, `achievementType?`, `points?`, `level?`, `dashboardUrl`, `shareUrl?` |
| Gamification Reward | `gamificationRewardEmailTemplate` | `studentName`, `rewardTitle`, `rewardDescription`, `rewardType?`, `pointsEarned?`, `totalPoints?`, `badgeLevel?`, `rank?`, `dashboardUrl` |

All templates extend `BaseTemplateData` and return `{ subject, html, text }`.

---

## Accessibility

- **WCAG AA contrast**: Primary green on white 7.2:1 · Gold on dark 4.6:1
- **Semantic HTML**: `role="presentation"` on layout tables, meaningful `alt` on images
- **Screen readers**: `aria-hidden="true"` on decorative SVGs, `focusable="false"` on geo band
- **Keyboard navigation**: All interactive links are `<a>` elements with `aria-label`
- **High contrast**: Dark mode palette maintains AA contrast throughout
- **Preheader**: Hidden inbox preview text via `display:none` zero-height div

---

## Dark Mode

Three-layer dark mode strategy ensures coverage across all major clients:

### Layer 1 — `@media (prefers-color-scheme: dark)`
Covers: Apple Mail · iOS Mail · Samsung Mail · Outlook.com · Yahoo Mail (partial)

### Layer 2 — `[data-ogsc]` attribute selectors
Covers: Gmail web dark mode (Gmail overrides `@media` queries)

### Layer 3 — Inline `bgcolor` attributes
Outlook ignores CSS entirely. For the header/footer backgrounds we use both `bgcolor=""` HTML attributes and inline `style=""` so Outlook renders the correct light-mode colours.

### Dark mode token mapping

| Light | Dark |
|---|---|
| `bgPage` #F8F7F3 | `darkBgPage` #0a1a11 |
| `bgCard` #ffffff | `darkBgCard` #0f1e16 |
| `bgFooter` #F4F3EE | `darkBgFooter` #081310 |
| `textPrimary` #1F2937 | `darkText` #D1FAE5 |
| `textSecondary` #4B5563 | `darkTextMuted` #9DC4B0 |
| Headings `primary` | `darkHeading` #6EE7B7 |
| Links `primary` | `darkLink` #6EE7B7 |
| `borderLight` | `darkBorder` #1a3828 |

---

## Compatibility Matrix

| Client | Layout | Buttons | Illustrations | Dark Mode | Animations |
|---|---|---|---|---|---|
| Outlook 2016-2021 | ✅ VML+table | ✅ VML roundrect | ➖ hidden | ➖ n/a | ➖ n/a |
| Outlook 2024 | ✅ | ✅ | ✅ | ➖ | ➖ |
| Gmail Web | ✅ | ✅ | ✅ | ✅ `[data-ogsc]` | ➖ |
| Gmail iOS/Android | ✅ | ✅ | ✅ | ✅ | ➖ |
| Apple Mail macOS | ✅ | ✅ | ✅ | ✅ `@media` | ✅ |
| iOS Mail | ✅ | ✅ | ✅ | ✅ `@media` | ✅ |
| Outlook.com | ✅ | ✅ | ✅ | ✅ `@media` | ➖ |
| Yahoo Mail | ✅ | ✅ | ✅ | ✅ partial | ➖ |
| Samsung Mail | ✅ | ✅ | ✅ | ✅ `@media` | ✅ |
| Thunderbird | ✅ | ✅ | ✅ | ✅ | ➖ |
| ProtonMail | ✅ | ✅ | ✅ | ✅ | ➖ |
| Fastmail | ✅ | ✅ | ✅ | ✅ | ➖ |

---

## Mobile

- Max-width: 600px, scales to 100% on smaller screens
- `@media only screen and (max-width: 620px)`:
  - Border radius removed (`email-card`)
  - Padding reduced: body 28px/20px, footer 22px/16px
  - Headings shrink to 20px
  - Stat values shrink to 22px
  - Inner cards: 16px padding, 12px radius

---

## Performance

- **HTML size**: All templates render 25–55 KB (within Gmail's 102 KB clipping threshold)
- **Zero external images**: All illustrations and logo are inline SVG
- **Google Fonts**: Loaded via `<link>` with `preconnect` hints — fails gracefully to Tahoma
- **Inlined CSS**: All styles inlined or in `<style>` — no external stylesheet requests
- **No JavaScript**: Email clients strip JS. All interactions use plain anchor links

---

## Developer Guide

### Sending an email

```ts
// Inject EmailTemplateService
constructor(
  private readonly emailTemplate: EmailTemplateService,
  private readonly emailBrand: EmailBrandService,
) {}

// Resolve brand data for a tenant
const brand = this.emailBrand.resolve(tenantBranding);

// Send
await this.emailTemplate.sendWelcome(user.email, {
  ...brand,
  fullName: user.fullName,
  loginUrl: 'https://siraja.website/login',
});
```

### All APIs (EmailTemplateService)

```ts
sendWelcome(to, data: WelcomeTemplateData)
sendVerification(to, data: VerificationTemplateData)
sendOtp(to, data: OtpTemplateData)
sendPasswordReset(to, data: PasswordResetTemplateData)
sendNotification(to, data: NotificationTemplateData)
sendSystemAlert(to, data: SystemAlertTemplateData)
sendInvitation(to, data: InvitationTemplateData)
sendWeeklySummary(to, data: WeeklySummaryTemplateData)
sendMonthlyReport(to, data: MonthlyReportTemplateData)
sendSecurityAlert(to, data: SecurityAlertTemplateData)
sendAchievement(to, data: AchievementTemplateData)
sendGamificationReward(to, data: GamificationRewardTemplateData)
```

All methods are non-fatal — email errors are caught, logged, and never crash the calling flow.

### Generating previews

```bash
cd backend
npm run email:preview
```

Open `email-previews/index.html` in a browser to browse all 18 rendered templates.

---

## Customization Guide

### Tenant branding via `EmailBrandService`

```ts
// Pass a TenantBrandingInput — any field can be omitted
const brand = emailBrandService.resolve({
  name:         'دار الحفاظ',
  logoUrl:      'https://r2.daralhuffaz.com/logo.png',  // HTTPS only
  tagline:      'أكاديمية متخصصة في حفظ القرآن الكريم',
  colors: {
    primary: '#1B4F72',
    accent:  '#F39C12',
  },
  supportEmail: 'support@daralhuffaz.com',
  customDomain: 'daralhuffaz.com',  // → websiteUrl = https://daralhuffaz.com
  socialLinks: [
    { icon: '🐦', label: 'تويتر',    url: 'https://twitter.com/daralhuffaz' },
    { icon: '📸', label: 'إنستغرام', url: 'https://instagram.com/daralhuffaz' },
  ],
  footerText: 'مرخصة من وزارة التعليم — رقم الترخيص: ١٢٣٤٥',
});
```

### Adding a new template

1. Create `backend/src/shared/email/templates/my-template.template.ts`
2. Export interface extending `BaseTemplateData` and a function returning `{ subject, html, text }`
3. Add `send*` method to `EmailTemplateService`
4. Add an import in `email-template.service.ts`
5. Add a preview case in `scripts/generate-email-previews.ts`
6. Run `npm run email:preview` to verify

---

## File Structure

```
backend/src/shared/email/
├── brand/
│   ├── brand-config.ts          ← SIRAJA_COLORS, tokens, helpers, illustrations
│   └── email-brand.service.ts   ← Tenant override resolver
├── templates/
│   ├── base.template.ts         ← Premium email shell
│   ├── welcome.template.ts
│   ├── verification.template.ts
│   ├── otp.template.ts
│   ├── password-reset.template.ts
│   ├── notification.template.ts
│   ├── system-alert.template.ts
│   ├── invitation.template.ts
│   ├── weekly-summary.template.ts
│   ├── monthly-report.template.ts
│   ├── security-alert.template.ts
│   ├── achievement.template.ts
│   └── gamification-reward.template.ts
├── providers/
│   └── smtp-email.provider.ts   ← Nodemailer SMTP delivery
├── email-template.service.ts    ← Public API — send* methods
├── email-provider.interface.ts  ← IEmailProvider contract
└── email.module.ts              ← NestJS module registration

backend/scripts/
└── generate-email-previews.ts   ← npm run email:preview

email-previews/                  ← Generated static HTML (git-ignored optional)
├── index.html
├── welcome.html
└── ...

docs/
└── email-design-system.md       ← This file
```
