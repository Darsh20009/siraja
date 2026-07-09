import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PermissionsMetadata } from '../decorators/require-permissions.decorator';
import {
  IPermissionResolver,
  PERMISSION_RESOLVER,
} from '@core/domain/authorization/permission-resolver.interface';
import { PermissionContext } from '@core/infrastructure/authorization/permission-context';
import { Role } from '@shared/enums/roles.enum';

/**
 * Fine-grained permission enforcement — runs AFTER `JwtAuthGuard` (so
 * `request.user` is populated) and BEFORE `TenantScopeGuard` /
 * `ResourceOwnershipGuard` in the global guard order (see
 * `AuthorizationModule` for the exact `APP_GUARD` registration order).
 *
 * `Role.SUPER_ADMIN` bypasses every permission check unconditionally —
 * this is the one and only bypass path in the whole authorization
 * system, and it lives here so it cannot be forgotten on a per-route
 * basis.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PERMISSION_RESOLVER) private readonly permissionResolver: IPermissionResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<PermissionsMetadata | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!metadata || metadata.keys.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.id) {
      throw new ForbiddenException('No authenticated user on request — PermissionsGuard requires JwtAuthGuard to run first.');
    }

    // Super Admin bypass is decided directly off the JWT-asserted role,
    // never via a tenant-filtered DB lookup — a Super Admin's own
    // `tenantId` (a reserved platform tenant, see `User` schema doc)
    // will almost never match the tenant resolved from the URL when
    // acting cross-tenant, so resolving "isSuperAdmin" through a query
    // scoped to `request.tenant.id` would incorrectly deny them. Bypass
    // must never depend on which tenant's data happens to be visible.
    const userRoles: Role[] = user.roles ?? [];
    if (userRoles.includes(Role.SUPER_ADMIN)) return true;

    const tenantId = request.tenant?.id ?? user.tenantId;
    const permissionContext: PermissionContext | undefined = request.permissionContext;

    let effective = permissionContext?.effective;
    if (!effective) {
      effective = await this.permissionResolver.resolveForUser(user.id, tenantId);
      permissionContext?.set(effective);
    }

    const allowed = this.permissionResolver.hasPermissions(effective, metadata.keys, metadata.match);
    if (!allowed) {
      throw new ForbiddenException(
        `Missing required permission(s) [${metadata.match}]: ${metadata.keys.join(', ')}`,
      );
    }
    return true;
  }
}
