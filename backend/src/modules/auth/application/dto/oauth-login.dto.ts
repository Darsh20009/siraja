import { IsOptional, IsString } from 'class-validator';

/**
 * Mobile/SPA clients exchange a provider-issued ID token directly
 * (no server-side redirect dance needed), which is why this DTO exists
 * alongside the Passport redirect strategies — `/auth/google` and
 * `/auth/apple` cover browser redirect flows, `/auth/google/token` and
 * `/auth/apple/token` (using this DTO) cover native app flows that
 * already hold a provider token.
 */
export class OAuthTokenLoginDto {
  @IsString()
  idToken: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsString()
  @IsOptional()
  platform?: string;
}
