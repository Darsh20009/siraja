import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Injects the resolved tenant (attached by TenantMiddleware/guards)
 * into a controller handler parameter.
 * Structure only — population wired alongside the tenants feature.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
