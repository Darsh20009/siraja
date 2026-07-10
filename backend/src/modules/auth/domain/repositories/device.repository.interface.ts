import { Types } from 'mongoose';
import { DeviceDocument } from '@database/mongoose/schemas';

export interface UpsertDeviceInput {
  tenantId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  deviceId: string;
  deviceName?: string;
  platform: string;
  appVersion?: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Device Module contract — "remembered devices" independent of any
 * single login/session, backing device tracking + revocation.
 */
export interface IDeviceRepository {
  upsertOnLogin(input: UpsertDeviceInput): Promise<DeviceDocument>;
  findById(id: Types.ObjectId | string): Promise<DeviceDocument | null>;
  listForUser(userId: Types.ObjectId | string): Promise<DeviceDocument[]>;
  revoke(id: Types.ObjectId | string): Promise<void>;
}

export const DEVICE_REPOSITORY = Symbol('DEVICE_REPOSITORY');
