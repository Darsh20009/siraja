---
name: Siraja Email Branding System
description: Premium email design system — brand-config helpers, EmailBrandService API, dark mode strategy, tenant overrides, illustration types, preview generation.
---

## Rule
All email brand data must come from `EmailBrandService.resolve(tenantBranding?)` — never hardcode colors, URLs, or names in templates.

## Key files
- `backend/src/shared/email/brand/brand-config.ts` — SIRAJA_COLORS, SIRAJA_BRAND_DEFAULTS, SIRAJA_LOGO_SVG, getLogoMarkup(), getGeoPatternBand(), getButtonHtml(), getCardHtml(), getCodeBoxHtml(), getStatBoxHtml(), getSocialLinksHtml(), getEmailIllustration(), EMAIL_FONT_STACK, GOOGLE_FONTS_LINK
- `backend/src/shared/email/brand/email-brand.service.ts` — Injectable; `resolve(tenantBranding?)` → BaseTemplateData; isSafeLogoUrl() static helper
- `backend/src/shared/email/templates/base.template.ts` — Premium HTML shell (radial gradient header, geometric band, frosted glass logo, decorative dividers, Quran verse footer)
- `backend/scripts/generate-email-previews.ts` — `npm run email:preview` → 18 HTML files in /email-previews/
- `docs/email-design-system.md` — Full design system documentation
- `email-previews/` — 18+ generated HTML files (index.html = browsable catalogue)

## EmailBrandService pattern
```ts
const brand = this.emailBrand.resolve(tenantBranding ? {
  name, logoUrl, tagline, colors, supportEmail, customDomain, socialLinks, footerText
} : null);
const { html } = welcomeEmailTemplate({ ...brand, fullName, loginUrl });
```
EmailModule exports EmailBrandService globally — inject directly without explicit import in feature modules.

## Tenant branding overrides (all optional)
name, logoUrl (HTTPS only), tagline, colors.primary, colors.accent, supportEmail, customDomain (→ websiteUrl), socialLinks (SocialLink[]), footerText

## getButtonHtml — variant param
variant: 'primary' (default emerald), 'danger' (red #DC2626), 'success' (green #16A34A)
Each variant auto-derives fill, border, shadow.

## getEmailIllustration types
welcome | verification | otp | password-reset | notification | system-alert | invitation | weekly-summary | monthly-report | security-alert | achievement | gamification-reward
All wrapped in MSO conditionals — Outlook skips them, modern clients render inline SVG.

## getGeoPatternBand — literal type gotcha
Parameters primaryColor and accentColor must be typed as `string` (not inferred literals) or callers pass branded hex strings and get TS2345. Fixed in brand-config.ts.

## Dark mode — 2-layer strategy
- `@media (prefers-color-scheme: dark)` — Apple Mail, iOS, Samsung, Outlook.com
- `[data-ogsc] .classname` — Gmail dark mode (strips @media, reads attribute selectors)
Header is already dark (radial emerald gradient) — no inversion needed.

## Font strategy
Cairo (Google Fonts <link>) loads in Apple Mail, Yahoo, Samsung, Outlook.com.
Gmail strips <link> — falls back to Tahoma (fully RTL-capable on Windows).
line-height: 1.9 on Arabic body text (needs more breathing room than Latin).

**Why:** EmailModule stays dependency-free from MongoDB; callers own the TenantBranding lookup.
**How to apply:** Services sending email inject EmailBrandService, call resolve() with optional tenant data from TenantBrandingRepository, then spread into template call.
