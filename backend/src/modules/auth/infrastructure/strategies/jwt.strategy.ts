import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload } from '../../domain/value-objects/jwt-payload';

/**
 * Registers Passport strategy name 'jwt' — the strategy `JwtAuthGuard`
 * (Phase 1, `common/guards/jwt-auth.guard.ts`) has referenced since it
 * was scaffolded. `validate`'s return value becomes `request.user`,
 * consumed as-is by every Phase 3 authorization guard
 * (`PermissionsGuard`, `TenantScopeGuard`, `ResourceOwnershipGuard`),
 * so its shape must keep matching `AccessTokenPayload`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  validate(payload: AccessTokenPayload): AccessTokenPayload {
    return payload;
  }
}
