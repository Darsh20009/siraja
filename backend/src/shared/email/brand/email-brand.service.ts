import { Injectable } from '@nestjs/common';
import { BaseTemplateData } from '../templates/base.template';
import { SIRAJA_BRAND_DEFAULTS, SIRAJA_COLORS } from './brand-config';

/**
 * Minimal shape of TenantBranding data needed for email rendering.
 * Decoupled from the Mongoose document to avoid circular dependencies.
 * Callers (controllers, use-cases) fetch TenantBranding from their own
 * repositories and pass only this projection here.
 */
export interface TenantBrandingInput {
  /** Display name of the tenant (e.g. "دار الحفاظ") */
  name?: string;
  /** Publicly-reachable logo image URL (Cloudflare R2, CDN …) */
  logoUrl?: string;
  /** Optional tagline overriding the Siraja default */
  tagline?: string;
  colors?: {
    primary?: string;
    accent?: string;
  };
  /** Overrides the default support@siraja.website */
  supportEmail?: string;
  /**
   * Custom domain (without protocol), e.g. "app.daralhuffaz.com".
   * If present, websiteUrl is set to https://<customDomain>.
   */
  customDomain?: string;
}

/**
 * EmailBrandService
 * ─────────────────
 * Resolves the BaseTemplateData injected into every email template.
 *
 * Usage:
 *   const brand = emailBrandService.resolve(tenantBranding);
 *   const { html } = verificationEmailTemplate({ ...brand, verificationUrl, ... });
 *
 * When no tenant branding is available (platform-level emails, admin alerts),
 * call resolve() with no argument — you get the Siraja defaults.
 */
@Injectable()
export class EmailBrandService {
  /**
   * Merge Siraja defaults with optional tenant overrides.
   * Any falsy value from the tenant is skipped; the Siraja default is kept.
   */
  resolve(tenantBranding?: TenantBrandingInput | null): BaseTemplateData {
    if (!tenantBranding) {
      return this.sirajaBrand();
    }

    const websiteUrl = tenantBranding.customDomain
      ? `https://${tenantBranding.customDomain}`
      : SIRAJA_BRAND_DEFAULTS.websiteUrl;

    return {
      tenantName:    tenantBranding.name        || SIRAJA_BRAND_DEFAULTS.tenantName,
      tenantTagline: tenantBranding.tagline      || undefined,     // fallback handled in template
      logoUrl:       tenantBranding.logoUrl      || undefined,     // undefined → Siraja SVG
      primaryColor:  tenantBranding.colors?.primary || SIRAJA_BRAND_DEFAULTS.primaryColor,
      accentColor:   tenantBranding.colors?.accent  || SIRAJA_BRAND_DEFAULTS.accentColor,
      supportEmail:  tenantBranding.supportEmail || SIRAJA_BRAND_DEFAULTS.supportEmail,
      websiteUrl,
      year: new Date().getFullYear(),
    };
  }

  /** Pure Siraja platform brand — no tenant overrides */
  private sirajaBrand(): BaseTemplateData {
    return {
      tenantName:   SIRAJA_BRAND_DEFAULTS.tenantName,
      primaryColor: SIRAJA_BRAND_DEFAULTS.primaryColor,
      accentColor:  SIRAJA_BRAND_DEFAULTS.accentColor,
      supportEmail: SIRAJA_BRAND_DEFAULTS.supportEmail,
      websiteUrl:   SIRAJA_BRAND_DEFAULTS.websiteUrl,
      year: new Date().getFullYear(),
    };
  }

  /**
   * Validate that tenant logo URL is safe to render in email.
   * Only HTTPS public URLs are allowed (data: URIs and http: rejected).
   */
  static isSafeLogoUrl(url: string | undefined): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Build an inline CSS string for custom primary/accent colors.
   * Useful when you need a quick color override without a full brand object.
   */
  static colorVars(primary: string, accent: string): string {
    return `--siraja-primary:${primary};--siraja-accent:${accent};`;
  }
}

// Re-export SIRAJA_COLORS so callers can access the full palette from one import
export { SIRAJA_COLORS };
