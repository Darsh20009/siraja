---
name: Siraja Email Branding System
description: Brand directory structure, EmailBrandService API, dark mode approach, tenant logo handling, Cairo font strategy.
---

## Rule
All email brand data must come from `EmailBrandService.resolve(tenantBranding?)` — never hardcode colors, URLs, or names in templates.

## Key files
- `backend/src/shared/email/brand/siraja-logo.svg` — official SVG source (octagonal lantern, viewBox 0 0 80 96)
- `backend/src/shared/email/brand/brand-config.ts` — SIRAJA_COLORS, SIRAJA_BRAND_DEFAULTS, SIRAJA_LOGO_SVG string, getLogoMarkup(), EMAIL_FONT_STACK, GOOGLE_FONTS_LINK
- `backend/src/shared/email/brand/email-brand.service.ts` — Injectable; `resolve(tenantBranding?)` → BaseTemplateData; isSafeLogoUrl() static helper
- `backend/src/shared/email/templates/base.template.ts` — HTML shell; accepts logoUrl (→ <img>) or uses inline SVG fallback
- `email-previews/` — 12 generated HTML files; re-run generate-email-previews.ts to refresh

## EmailBrandService pattern
```ts
const brand = this.emailBrand.resolve(tenantBranding ? {
  name, logoUrl, colors, supportEmail, customDomain
} : null);
const { html } = welcomeEmailTemplate({ ...brand, fullName, loginUrl });
```
EmailModule exports EmailBrandService globally — inject directly without explicit import in feature modules.

## Dark mode
- `@media (prefers-color-scheme: dark)` — Apple Mail, iOS, Samsung, Outlook.com
- `[data-ogsc] .classname` rules — Gmail dark mode (strips @media, reads attribute selectors)
- Header already dark (emerald gradient) — no inversion needed in either mode

## Tenant logo
- Provide HTTPS URL only — validated by `EmailBrandService.isSafeLogoUrl()`
- Rendered as `<img width="60" height="60" style="border-radius:8px;object-fit:contain">`
- Falsy/absent URL → Siraja inline SVG (zero external dependency)

## Font strategy
Cairo (Google Fonts link in <head>) loads in Apple Mail, Yahoo, Samsung, Outlook.com.
Gmail strips <link> tags — falls back to Tahoma (fully RTL-capable on Windows).
Never use Traditional Arabic / Simplified Arabic — unavailable cross-platform.
line-height: 1.9 on body text (Arabic needs more breathing room than Latin).

**Why:** EmailModule stays dependency-free from MongoDB; callers own the TenantBranding lookup.
**How to apply:** Services sending email inject EmailBrandService, call resolve() with optional
tenant data fetched from TenantBrandingRepository, then spread the result into the template call.
