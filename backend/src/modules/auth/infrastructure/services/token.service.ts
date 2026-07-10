import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import { AccessTokenPayload } from '../../domain/value-objects/jwt-payload';

/**
 * Everything token-shaped in one place: access-token signing/verifying
 * (short-lived JWT) and opaque refresh-token generation/hashing
 * (long-lived random string, never a JWT — see `RefreshTokenContext`
 * doc for why). `RefreshTokenRotation`'s "hash before storing, compare
 * by hash" logic all flows through here so it can't drift between call
 * sites.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwtService.verify<AccessTokenPayload>(token, {
      secret: this.configService.get<string>('jwt.accessSecret'),
    });
  }

  /** 256 bits of entropy, URL-safe — the raw refresh token handed to the client. */
  generateOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  generateFamilyId(): string {
    return randomBytes(16).toString('hex');
  }

  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /** Single-use email token (verification / password reset) — same shape as a refresh token, shorter TTL. */
  generateEmailToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('base64url');
    return { raw, hash: this.hashToken(raw) };
  }

  getRefreshTokenTtlMs(): number {
    return this.parseDurationToMs(this.configService.get<string>('jwt.refreshExpiresIn') || '30d');
  }

  private parseDurationToMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const value = Number(match[1]);
    const unit = match[2];
    const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] as number;
    return value * unitMs;
  }
}
