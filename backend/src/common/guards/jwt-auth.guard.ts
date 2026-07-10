import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '@modules/auth/infrastructure/decorators/public.decorator';

/**
 * Guards routes using the 'jwt' Passport strategy
 * (registered in modules/auth/infrastructure/strategies, Phase 4).
 * Routes annotated with `@Public()` (registration, login, refresh,
 * email verification, password reset, OAuth entrypoints) skip
 * authentication entirely — everything else is authenticated by
 * default since this guard is registered globally.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
