import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AuthProvider } from '@shared/enums/auth-provider.enum';
import { VerifiedOAuthProfile } from '../../application/use-cases/oauth-login.use-case';

const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';

/**
 * Apple Sign In verification. Apple's native-first flow gives the client
 * an `identityToken` (a signed JWT) directly — there is no
 * `passport-apple` strategy registered here because Apple has no
 * meaningful "redirect + consent screen" flow for mobile the way Google
 * does; both mobile and web clients funnel through
 * `POST /auth/apple/token` verifying the identity token the same way.
 * Kept as a plain service (not a Passport `Strategy` subclass) since
 * there is nothing Passport's request-driven model adds here.
 *
 * `jwks-rsa` fetches and caches Apple's rotating public signing keys so
 * the identity token's signature can be verified without a hardcoded
 * certificate.
 */
@Injectable()
export class AppleStrategy {
  private readonly jwks = jwksClient({ jwksUri: APPLE_JWKS_URI, cache: true, cacheMaxAge: 24 * 60 * 60 * 1000 });

  constructor(private readonly configService: ConfigService) {}

  async verify(identityToken: string): Promise<VerifiedOAuthProfile> {
    try {
      const decodedHeader = jwt.decode(identityToken, { complete: true });
      if (!decodedHeader || typeof decodedHeader === 'string') {
        throw new Error('Malformed Apple identity token.');
      }
      const key = await this.jwks.getSigningKey(decodedHeader.header.kid);
      const payload = jwt.verify(identityToken, key.getPublicKey(), {
        algorithms: ['RS256'],
        issuer: APPLE_ISSUER,
        audience: this.configService.get<string>('oauth.apple.clientId'),
      }) as jwt.JwtPayload;

      return {
        provider: AuthProvider.APPLE,
        providerUserId: payload.sub as string,
        email: payload.email as string | undefined,
        emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid Apple identity token.');
    }
  }
}
