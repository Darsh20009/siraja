import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { AuthProvider } from '@shared/enums/auth-provider.enum';
import { VerifiedOAuthProfile } from '../../application/use-cases/oauth-login.use-case';

/**
 * Browser-redirect OAuth flow: GET /auth/google → Google consent screen
 * → GET /auth/google/callback lands here. `validate`'s return value is
 * attached to `request.user` by Passport and picked up by
 * `AuthController#googleCallback`, which hands it to `OAuthLoginUseCase`
 * unchanged. Native app clients that already hold a Google ID token skip
 * this strategy entirely and call `POST /auth/google/token` instead
 * (see `AuthController` + `GoogleTokenVerifierService`).
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('oauth.google.clientId') || 'not-configured',
      clientSecret: configService.get<string>('oauth.google.clientSecret') || 'not-configured',
      callbackURL: configService.get<string>('oauth.google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback): void {
    const email = profile.emails?.[0]?.value;
    const result: VerifiedOAuthProfile = {
      provider: AuthProvider.GOOGLE,
      providerUserId: profile.id,
      email,
      fullName: profile.displayName,
      emailVerified: (profile.emails?.[0] as { value: string; verified?: boolean })?.verified ?? true,
    };
    done(null, result as Express.User);
  }
}
