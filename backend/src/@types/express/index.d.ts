/**
 * Global Express Request augmentation.
 *
 * Adds `req.tenant` populated by `TenantMiddleware` from the `X-Tenant-Slug`
 * header. Using an inline `import()` type keeps this file ambient (no
 * top-level import → not a module) so TypeScript applies the augmentation
 * automatically to every file that imports from 'express'.
 */
declare module 'express-serve-static-core' {
  interface Request {
    tenant?: {
      id: string;
      slug: string;
      status: import('../../shared/enums/tenant-status.enum').TenantStatus;
    };
  }
}
