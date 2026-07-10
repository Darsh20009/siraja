import { IsEmail } from 'class-validator';

/** Email-only, per Phase 4 scope — no SMS password reset. */
export class RequestPasswordResetDto {
  @IsEmail()
  email: string;
}
