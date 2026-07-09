import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Resets/initializes the per-request authorization state before routing.
 *
 * IMPORTANT ordering note: in Nest, middleware always runs *before*
 * guards, and `request.user` is only populated once `JwtAuthGuard`'s
 * Passport strategy runs — so this middleware CANNOT resolve effective
 * permissions itself (there is no authenticated user yet at this point).
 * Its job is limited to preparing a clean slate on the raw request object
 * so every downstream guard/decorator has a consistent shape to read from
 * even if `PermissionsGuard` never runs (e.g. a public route). The actual
 * resolution happens in `PermissionsGuard`, which caches its result onto
 * the request-scoped `PermissionContext` for reuse by guards later in the
 * same request's chain.
 *
 * Structure only — wired in `AppModule` alongside `TenantMiddleware`.
 */
@Injectable()
export class PermissionContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    (req as Request & { permissionKeys?: ReadonlySet<string> }).permissionKeys = undefined;
    next();
  }
}
