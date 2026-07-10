import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import {
  User,
  UserSchema,
  RefreshToken,
  RefreshTokenSchema,
  Device,
  DeviceSchema,
  VerificationToken,
  VerificationTokenSchema,
  PasswordHistory,
  PasswordHistorySchema,
  LoginAttempt,
  LoginAttemptSchema,
  AuditLog,
  AuditLogSchema,
} from '@database/mongoose/schemas';

import { USER_AUTH_REPOSITORY } from './domain/repositories/user-auth.repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository.interface';
import { DEVICE_REPOSITORY } from './domain/repositories/device.repository.interface';
import { VERIFICATION_TOKEN_REPOSITORY } from './domain/repositories/verification-token.repository.interface';
import { LOGIN_ATTEMPT_REPOSITORY } from './domain/repositories/login-attempt.repository.interface';

import { UserAuthRepository } from './infrastructure/repositories/user-auth.repository';
import { RefreshTokenRepository } from './infrastructure/repositories/refresh-token.repository';
import { DeviceRepository } from './infrastructure/repositories/device.repository';
import { VerificationTokenRepository } from './infrastructure/repositories/verification-token.repository';
import { LoginAttemptRepository } from './infrastructure/repositories/login-attempt.repository';

import { PasswordService } from './infrastructure/services/password.service';
import { TokenService } from './infrastructure/services/token.service';
import { MailerService } from './infrastructure/services/mailer.service';
import { AuthAuditService } from './infrastructure/services/audit.service';
import { BruteForceGuardService } from './infrastructure/services/brute-force-guard.service';
import { GoogleTokenVerifierService } from './infrastructure/services/google-token-verifier.service';

import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { GoogleStrategy } from './infrastructure/strategies/google.strategy';
import { AppleStrategy } from './infrastructure/strategies/apple.strategy';

import { IssueSessionHelper } from './application/use-cases/issue-session.helper';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { LogoutAllUseCase } from './application/use-cases/logout-all.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { OAuthLoginUseCase } from './application/use-cases/oauth-login.use-case';
import { SessionManagementUseCase } from './application/use-cases/session-management.use-case';

import { AuthController } from './infrastructure/controllers/auth.controller';
import { SessionsController } from './infrastructure/controllers/sessions.controller';
import { DevicesController } from './infrastructure/controllers/devices.controller';

/**
 * Auth Module — Phase 4.
 *
 * Encapsulates Authentication, Session, and Device bounded contexts
 * following Clean Architecture:
 * - domain: repository interfaces + value objects (no framework deps)
 * - application: use cases (business rules) + DTOs
 * - infrastructure: controllers, Mongoose repositories, Passport
 *   strategies, and stateless services (hashing, tokens, mail, audit)
 *
 * `PassportModule`/`JwtModule` are configured here (not globally) since
 * only this module signs/verifies/negotiates auth — every other module
 * only ever consumes the resulting `request.user` via the globally
 * registered `JwtAuthGuard` (`AuthorizationModule`, Phase 3).
 */
@Module({
  imports: [
    ConfigModule,
    PassportModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: VerificationToken.name, schema: VerificationTokenSchema },
      { name: PasswordHistory.name, schema: PasswordHistorySchema },
      { name: LoginAttempt.name, schema: LoginAttemptSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret'),
        signOptions: { expiresIn: configService.get<string>('jwt.accessExpiresIn') },
      }),
    }),
  ],
  controllers: [AuthController, SessionsController, DevicesController],
  providers: [
    { provide: USER_AUTH_REPOSITORY, useClass: UserAuthRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepository },
    { provide: DEVICE_REPOSITORY, useClass: DeviceRepository },
    { provide: VERIFICATION_TOKEN_REPOSITORY, useClass: VerificationTokenRepository },
    { provide: LOGIN_ATTEMPT_REPOSITORY, useClass: LoginAttemptRepository },

    PasswordService,
    TokenService,
    MailerService,
    AuthAuditService,
    BruteForceGuardService,
    GoogleTokenVerifierService,

    JwtStrategy,
    GoogleStrategy,
    AppleStrategy,

    IssueSessionHelper,
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    LogoutAllUseCase,
    VerifyEmailUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    OAuthLoginUseCase,
    SessionManagementUseCase,
  ],
  exports: [TokenService],
})
export class AuthModule {}
