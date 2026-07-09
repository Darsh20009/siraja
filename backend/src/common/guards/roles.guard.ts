import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '@shared/enums/roles.enum';

/**
 * Enforces role-based access control using metadata set by @Roles().
 * Structure only — assumes request.user.roles (a non-empty array,
 * supporting multiple roles per user) is populated by JwtAuthGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const userRoles: Role[] = user?.roles ?? [];
    return userRoles.some((role) => requiredRoles.includes(role));
  }
}
