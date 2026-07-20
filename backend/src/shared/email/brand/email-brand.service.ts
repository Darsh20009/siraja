import { Injectable } from '@nestjs/common';
import { BaseTemplateData } from '../templates/base.template';
import { SIRAJA_BRAND_DEFAULTS, isSafeLogoUrl } from './brand-config';

/**
 * Minimal projection of TenantBranding data needed for email rendering.
 * Decoupled from the Mongoose document to avoid circular dependencies.
 *
 * Callers fetch TenantBranding from TenantBrandingRepository and pass
 * only this shape here. EmailModule stays MongoDB-free.
 */
export interface TenantBrandingInput {
  /** Display name of the tenant (e.g. "دار الحفاظ") */
  name?: string;
  /**
   * Publicly-reachable HTTPS logo image URL (Cloudflare R2, CDN …).
   * Use isSafeLogoUrl() to validate before passing. Absent → Siraja SVG.
   */
  logoUrl?: string;
  /** Optional tagline replacing the Siraja default */
  tagline?: string;
  colors?: {
    primary?: string;
    accent?: string;
  };
  /** Overrides the default support@siraja.website */
  supportEmail?: string;
  /**
   * Custom domain without protocol, e.g. "app.daralhuffaz.com".
   * When present, websiteUrl becomes https://<customDomain>.
   */
  customDomain?: string;
}

/**
 * EmailBrandService
 * ─────────────────
 * Resolves the BaseTemplateData injected into every email template.
 * Merges optional tenant overrides with Siraja platform defaults.
 *
 * Usage:
 *   const brand = emailBrandService.resolve(tenantBranding);
 *   const { html } = verificationEmailTemplate({ ...brand, verificationUrl, fullName });
 *
 * When no tenant branding is available (platform-level emails, admin alerts):
 *   const brand = emailBrandService.resolve(null);
 */
@Injectable()
export class EmailBrandService {
  /**
   * Merge Siraja defaults with optional tenant overrides.
   * Any falsy value from the tenant input falls back to the platform default.
   */
  resolve(tenantBranding?: TenantBrandingInput | null): BaseTemplateData {
    if (!tenantBranding) return this.defaults();

    const websiteUrl = tenantBranding.customDomain
      ? `https://${tenantBranding.customDomain}`
      : SIRAJA_BRAND_DEFAULTS.websiteUrl;

    // Only accept HTTPS tenant logos
    const safeLogoUrl = isSafeLogoUrl(tenantBranding.logoUrl)
      ? tenantBranding.logoUrl
      : undefined;

    return {
      tenantName:    tenantBranding.name        || SIRAJA_BRAND_DEFAULTS.tenantName,
      tenantTagline: tenantBranding.tagline      || undefined,   // falls back in template
      logoUrl:       safeLogoUrl,                                // undefined → Siraja SVG
      primaryColor:  tenantBranding.colors?.primary || SIRAJA_BRAND_DEFAULTS.primaryColor,
      accentColor:   tenantBranding.colors?.accent  || SIRAJA_BRAND_DEFAULTS.accentColor,
      supportEmail:  tenantBranding.supportEmail || SIRAJA_BRAND_DEFAULTS.supportEmail,
      websiteUrl,
      year: new Date().getFullYear(),
    };
  }

  /** Pure Siraja platform brand — no tenant overrides */
  private defaults(): BaseTemplateData {
    return {
      tenantName:   SIRAJA_BRAND_DEFAULTS.tenantName,
      primaryColor: SIRAJA_BRAND_DEFAULTS.primaryColor,
      accentColor:  SIRAJA_BRAND_DEFAULTS.accentColor,
      supportEmail: SIRAJA_BRAND_DEFAULTS.supportEmail,
      websiteUrl:   SIRAJA_BRAND_DEFAULTS.websiteUrl,
      year: new Date().getFullYear(),
    };
  }
}

// Re-export isSafeLogoUrl so callers can validate without importing brand-config directly
export { isSafeLogoUrl };
