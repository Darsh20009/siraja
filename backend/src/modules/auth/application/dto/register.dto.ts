import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, MinLength, ValidateIf } from 'class-validator';
import { Role } from '@shared/enums/roles.enum';

/**
 * Registration accepts EITHER email or phone as the primary identifier
 * (at least one required) — phone is an identity only, never used for
 * OTP/verification per Phase 4 scope. If no email is provided there is
 * no way to verify or recover the account; the application layer
 * enforces that constraint (see `RegisterUseCase`) rather than the DTO,
 * since it's a cross-field business rule.
 */
export class RegisterDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsPhoneNumber()
  phone?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  fullName: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

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
