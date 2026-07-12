import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OWNERSHIP_KEY, OwnershipMetadata } from '../decorators/check-ownership.decorator';
import {
  IOwnershipResolver,
  OWNERSHIP_RESOLVER,
} from '@core/domain/authorization/ownership-resolver.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * Enforces per-instance resource ownership — runs AFTER `JwtAuthGuard`,
 * `PermissionsGuard`, and `TenantScopeGuard`. Answers "may THIS user act
 * on THIS specific resource", which permission checks alone cannot: a
 * sheikh with `sessions.update` still may not update another sheikh's
 * session.
 *
 * `Role.SUPER_ADMIN` and `Role.TENANT_ADMIN` always bypass — Tenant Admin
 * controls everything within their own tenant (already enforced by
 * `TenantScopeGuard`), so per-instance ownership never applies to them.
 * Only Supervisor / Sheikh / Parent / Student are actually evaluated
 * against `IOwnershipResolver` (see its interface doc for the exact rule
 * per role).
 */
@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(OWNERSHIP_RESOLVER) private readonly ownershipResolver: IOwnershipResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<OwnershipMetadata | undefined>(OWNERSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!metadata) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false; // JwtAuthGuard must run first.
    const userRoles: Role[] = user.roles ?? [];
    if (userRoles.includes(Role.SUPER_ADMIN) || userRoles.includes(Role.TENANT_ADMIN)) return true;

    const resourceId = request.params?.[metadata.paramKey];
    if (!resourceId) {
      throw new ForbiddenException(
        `ResourceOwnershipGuard expected route param "${metadata.paramKey}" but none was present.`,
      );
    }

    const tenantId = request.tenant?.id ?? user.tenantId;
    // A user holding multiple roles owns the resource if ANY one of
    // their roles satisfies that role's ownership rule.
    const isOwner = await this.ownershipResolver.isOwner({
      userId: user.sub,
      tenantId,
      roles: userRoles,
      resourceType: metadata.resourceType,
      resourceId,
    });

    if (!isOwner) {
      throw new ForbiddenException(`You do not have access to this ${metadata.resourceType}.`);
    }
    return true;
  }
}
