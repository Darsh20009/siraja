import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Injects the resolved tenant (`{ id, slug, status }`, attached by
 * `TenantMiddleware` from the `X-Tenant-Slug` header) into a controller
 * handler parameter. `undefined` on platform-global routes where no
 * tenant slug was sent.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
