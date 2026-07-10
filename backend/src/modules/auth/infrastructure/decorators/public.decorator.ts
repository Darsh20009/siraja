import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as not requiring authentication. Registration/login/
 * refresh/etc. must be reachable without a bearer token — since
 * `JwtAuthGuard` is registered globally (`AuthorizationModule`,
 * Phase 3), every such route needs this explicitly rather than relying
 * on route placement alone.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
