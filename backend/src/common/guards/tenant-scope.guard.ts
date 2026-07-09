import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@shared/enums/roles.enum';

/**
 * Enforces "Tenant Admin (and every non-super role) only controls their
 * own tenant". Runs AFTER `JwtAuthGuard` and `PermissionsGuard`.
 *
 * Two checks, both required:
 *   1. The authenticated user's `tenantId` must match the tenant resolved
 *      from the URL path (`TenantMiddleware` → `request.tenant`) — a
 *      Tenant Admin (or any non-super-admin) token issued for tenant A
 *      cannot be replayed against `/tenant-b/...` routes.
 *   2. Any `tenantId` explicitly present in the request body/query must
 *      also match — prevents a payload from smuggling a different
 *      tenant's id into a create/update call the URL alone wouldn't catch.
 *
 * `Role.SUPER_ADMIN` bypasses both checks — a Super Admin token is not
 * bound to any single tenant and may act across tenants (each individual
 * operation still requires the target tenant to be explicit, never
 * inferred, per the multi-tenant blueprint).
 */
@Injectable()
export class TenantScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false; // JwtAuthGuard must run first.
    const userRoles: Role[] = user.roles ?? [];
    if (userRoles.includes(Role.SUPER_ADMIN)) return true;

    const resolvedTenantId = request.tenant?.id;
    if (!resolvedTenantId) {
      throw new ForbiddenException('No tenant resolved for this request — TenantMiddleware must run first.');
    }
    if (String(user.tenantId) !== String(resolvedTenantId)) {
      throw new ForbiddenException('User does not belong to the requested tenant.');
    }

    const payloadTenantId = request.body?.tenantId ?? request.query?.tenantId;
    if (payloadTenantId && String(payloadTenantId) !== String(resolvedTenantId)) {
      throw new ForbiddenException('Payload tenantId does not match the requested tenant.');
    }

    return true;
  }
}
