import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Device, DeviceDocument } from '@database/mongoose/schemas';
import { IDeviceRepository, UpsertDeviceInput } from '../../domain/repositories/device.repository.interface';

@Injectable()
export class DeviceRepository implements IDeviceRepository {
  constructor(@InjectModel(Device.name) private readonly deviceModel: Model<DeviceDocument>) {}

  async upsertOnLogin(input: UpsertDeviceInput) {
    const now = new Date();
    return this.deviceModel
      .findOneAndUpdate(
        { tenantId: input.tenantId, userId: input.userId, deviceId: input.deviceId },
        {
          $set: {
            deviceName: input.deviceName,
            platform: input.platform,
            appVersion: input.appVersion,
            userAgent: input.userAgent,
            lastIpAddress: input.ipAddress,
            lastSeenAt: now,
            isTrusted: true,
            revokedAt: null,
          },
          $setOnInsert: { firstSeenAt: now },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  findById(id: Types.ObjectId | string) {
    return this.deviceModel.findById(id).exec();
  }

  listForUser(userId: Types.ObjectId | string) {
    return this.deviceModel.find({ userId, isTrusted: true }).sort({ lastSeenAt: -1 }).exec();
  }

  async revoke(id: Types.ObjectId | string) {
    await this.deviceModel.updateOne({ _id: id }, { isTrusted: false, revokedAt: new Date() }).exec();
  }
}
