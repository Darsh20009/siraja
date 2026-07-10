import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserDocument } from '@database/mongoose/schemas';
import { TokenService } from '../../infrastructure/services/token.service';
import {
  DEVICE_REPOSITORY,
  IDeviceRepository,
} from '../../domain/repositories/device.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import { AuthResult } from '../dto/auth-result';

export interface DeviceContext {
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  appVersion?: string;
  ipAddress: string;
  userAgent?: string;
}

/**
 * Shared "mint a new session for this user" logic used by every login
 * path (password, Google, Apple) and by registration — one place that
 * (a) upserts/registers the `Device`, (b) creates the `RefreshToken`
 * (= session) document with a fresh rotation family, and (c) signs the
 * paired access token. Keeping this out of each individual use case
 * avoids the three login paths silently drifting apart on session
 * creation semantics.
 */
@Injectable()
export class IssueSessionHelper {
  constructor(
    private readonly tokenService: TokenService,
    @Inject(DEVICE_REPOSITORY) private readonly devices: IDeviceRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: IRefreshTokenRepository,
  ) {}

  async issue(user: UserDocument, ctx: DeviceContext): Promise<AuthResult> {
    const device = await this.devices.upsertOnLogin({
      tenantId: user.tenantId,
      userId: user._id as Types.ObjectId,
      deviceId: ctx.deviceId ?? this.tokenService.generateOpaqueToken(),
      deviceName: ctx.deviceName,
      platform: ctx.platform ?? 'unknown',
      appVersion: ctx.appVersion,
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    });

    const familyId = this.tokenService.generateFamilyId();
    const rawRefreshToken = this.tokenService.generateOpaqueToken();
    const refreshTokenDoc = await this.refreshTokens.create({
      tenantId: user.tenantId,
      userId: user._id as Types.ObjectId,
      deviceId: device._id as Types.ObjectId,
      tokenHash: this.tokenService.hashToken(rawRefreshToken),
      familyId,
      expiresAt: new Date(Date.now() + this.tokenService.getRefreshTokenTtlMs()),
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const accessToken = this.tokenService.signAccessToken({
      sub: String(user._id),
      tenantId: String(user.tenantId),
      roles: user.roles,
      email: user.email,
      sessionId: String(refreshTokenDoc._id),
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: String(user._id),
        tenantId: String(user.tenantId),
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }
}
