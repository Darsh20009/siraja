import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuditAction } from '@shared/enums/audit.enum';
import {
  DEVICE_REPOSITORY,
  IDeviceRepository,
} from '../../domain/repositories/device.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import { AuthAuditService } from '../../infrastructure/services/audit.service';

export interface ActiveSessionView {
  sessionId: string;
  deviceId: string;
  deviceName?: string;
  platform: string;
  ipAddress?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface DeviceView {
  deviceId: string;
  deviceName?: string;
  platform: string;
  lastSeenAt: Date;
  lastIpAddress?: string;
  isTrusted: boolean;
}

/**
 * Session Module + Device Module read/mutate operations: "Active
 * Sessions" list, device list, and device-level revocation
 * (revoking a device force-revokes every refresh token tied to it,
 * covering the "log out this device everywhere" UX in one call).
 */
@Injectable()
export class SessionManagementUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: IRefreshTokenRepository,
    @Inject(DEVICE_REPOSITORY) private readonly devices: IDeviceRepository,
    private readonly audit: AuthAuditService,
  ) {}

  async listActiveSessions(userId: string): Promise<ActiveSessionView[]> {
    const sessions = await this.refreshTokens.listActiveForUser(userId);
    return sessions.map((s) => ({
      sessionId: String(s._id),
      deviceId: String(s.deviceId),
      ipAddress: s.ipAddress,
      platform: 'unknown',
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  async listDevices(userId: string): Promise<DeviceView[]> {
    const devices = await this.devices.listForUser(userId);
    return devices.map((d) => ({
      deviceId: String(d._id),
      deviceName: d.deviceName,
      platform: d.platform,
      lastSeenAt: d.lastSeenAt,
      lastIpAddress: d.lastIpAddress,
      isTrusted: d.isTrusted,
    }));
  }

  async revokeDevice(userId: string, tenantId: string, deviceId: string, ipAddress: string): Promise<void> {
    const device = await this.devices.findById(deviceId);
    if (!device) throw new NotFoundException('Device not found.');
    if (String(device.userId) !== String(userId)) {
      throw new ForbiddenException('You do not own this device.');
    }
    await this.devices.revoke(deviceId);
    await this.refreshTokens.revokeAllForDevice(deviceId, 'device_revoked');
    await this.audit.record({
      tenantId,
      actor: userId as unknown as Types.ObjectId,
      action: AuditAction.DEVICE_REVOKED,
      entityId: deviceId as unknown as Types.ObjectId,
      ipAddress,
    });
  }
}
