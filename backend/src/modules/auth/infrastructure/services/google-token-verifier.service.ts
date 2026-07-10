import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AuthProvider } from '@shared/enums/auth-provider.enum';
import { VerifiedOAuthProfile } from '../../application/use-cases/oauth-login.use-case';

/**
 * Verifies a Google ID token presented directly by a native/mobile
 * client (the `POST /auth/google/token` path) — as opposed to
 * `GoogleStrategy`, which handles the server-side browser redirect flow.
 * Both ultimately produce the same `VerifiedOAuthProfile` shape consumed
 * by `OAuthLoginUseCase`.
 */
@Injectable()
export class GoogleTokenVerifierService {
  private readonly client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new OAuth2Client(this.configService.get<string>('oauth.google.clientId'));
  }

  async verify(idToken: string): Promise<VerifiedOAuthProfile> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('oauth.google.clientId'),
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) throw new Error('No subject in Google token payload.');
      return {
        provider: AuthProvider.GOOGLE,
        providerUserId: payload.sub,
        email: payload.email,
        fullName: payload.name,
        emailVerified: payload.email_verified,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid Google token.');
    }
  }
}
