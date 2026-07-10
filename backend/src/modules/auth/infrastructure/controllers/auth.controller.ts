import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { extractRequestContext, extractTenantId } from '../helpers/request-context.helper';
import { RegisterDto } from '../../application/dto/register.dto';
import { LoginDto } from '../../application/dto/login.dto';
import { RefreshTokenDto } from '../../application/dto/refresh-token.dto';
import { VerifyEmailDto } from '../../application/dto/verify-email.dto';
import { RequestPasswordResetDto } from '../../application/dto/request-password-reset.dto';
import { ResetPasswordDto } from '../../application/dto/reset-password.dto';
import { OAuthTokenLoginDto } from '../../application/dto/oauth-login.dto';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { LogoutAllUseCase } from '../../application/use-cases/logout-all.use-case';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.use-case';
import { RequestPasswordResetUseCase } from '../../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import { OAuthLoginUseCase } from '../../application/use-cases/oauth-login.use-case';
import { GoogleTokenVerifierService } from '../services/google-token-verifier.service';
import { AppleStrategy } from '../strategies/apple.strategy';

/**
 * Authentication Module HTTP surface. Every route here is `@Public()`
 * except `/logout` and `/logout-all`, which require the caller to be
 * authenticated in order to know *which* session to revoke.
 *
 * Full flow diagrams: docs/architecture/10-authentication-blueprint.md.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly logoutAllUseCase: LogoutAllUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly oauthLoginUseCase: OAuthLoginUseCase,
    private readonly googleTokenVerifier: GoogleTokenVerifierService,
    private readonly appleStrategy: AppleStrategy,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.registerUseCase.execute(extractTenantId(req), dto, {
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      platform: dto.platform,
      ipAddress,
      userAgent,
    });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.loginUseCase.execute(extractTenantId(req), dto, {
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      platform: dto.platform,
      appVersion: dto.appVersion,
      ipAddress,
      userAgent,
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.refreshTokenUseCase.execute(dto.refreshToken, ipAddress, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() dto: RefreshTokenDto, @CurrentUser() user: any, @Req() req: Request) {
    const { ipAddress } = extractRequestContext(req);
    return this.logoutUseCase.execute(dto.refreshToken, user.sub, user.tenantId, ipAddress);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  logoutAll(@CurrentUser() user: any, @Req() req: Request) {
    const { ipAddress } = extractRequestContext(req);
    return this.logoutAllUseCase.execute(user.sub, user.tenantId, ipAddress);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    const { ipAddress } = extractRequestContext(req);
    return this.verifyEmailUseCase.execute(dto.token, ipAddress);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto, @Req() req: Request) {
    const { ipAddress } = extractRequestContext(req);
    await this.requestPasswordResetUseCase.execute(extractTenantId(req), dto.email, ipAddress);
    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const { ipAddress } = extractRequestContext(req);
    await this.resetPasswordUseCase.execute(dto.token, dto.newPassword, ipAddress);
    return { message: 'Password reset successfully.' };
  }

  // --- Google OAuth ---

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport redirects to Google's consent screen; nothing to do here.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.oauthLoginUseCase.execute(extractTenantId(req), req.user as any, { ipAddress, userAgent });
  }

  @Public()
  @Post('google/token')
  @HttpCode(HttpStatus.OK)
  async googleTokenLogin(@Body() dto: OAuthTokenLoginDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    const profile = await this.googleTokenVerifier.verify(dto.idToken);
    return this.oauthLoginUseCase.execute(extractTenantId(req), profile, {
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      platform: dto.platform,
      ipAddress,
      userAgent,
    });
  }

  // --- Apple Sign In (native identity-token flow only — see AppleStrategy doc) ---

  @Public()
  @Post('apple/token')
  @HttpCode(HttpStatus.OK)
  async appleTokenLogin(@Body() dto: OAuthTokenLoginDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    const profile = await this.appleStrategy.verify(dto.idToken);
    return this.oauthLoginUseCase.execute(extractTenantId(req), profile, {
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      platform: dto.platform,
      ipAddress,
      userAgent,
    });
  }
}
