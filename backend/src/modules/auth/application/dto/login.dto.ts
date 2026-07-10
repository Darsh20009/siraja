import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * `identifier` is an email or phone, resolved by the use case (tries
 * email shape first, falls back to phone lookup) — one field keeps the
 * client from having to know in advance which type the user will type.
 */
export class LoginDto {
  @IsString()
  identifier: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsString()
  @IsOptional()
  platform?: string;

  @IsString()
  @IsOptional()
  appVersion?: string;
}
