/**
 * Global Express Request augmentation.
 *
 * Adds `req.tenant` (populated by TenantMiddleware from the X-Tenant-Slug
 * header) and `req.user` (populated by JwtAuthGuard after token validation).
 *
 * `export {}` makes this a module file so that `declare module` below is
 * treated as a proper module augmentation (merges with the real
 * express-serve-static-core types) rather than an ambient declaration that
 * would shadow and replace them.
 */
export {};

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: {
      id: string;
      slug: string;
      status: import('../../shared/enums/tenant-status.enum').TenantStatus;
    };
    user?: {
      sub: string;
      tenantId: string;
      roles: string[];
      email: string;
      sessionId: string;
    };
  }
}
