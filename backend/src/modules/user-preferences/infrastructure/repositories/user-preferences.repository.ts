import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserPreferences, UserPreferencesDocument } from '@database/mongoose/schemas';
import {
  IUserPreferencesRepository,
  UpdateAnnouncementPreferencesInput,
  UpdateEmailPreferencesInput,
  UpdateNotificationPreferencesInput,
  UserPreferencesItem,
} from '../../domain/repositories/user-preferences.repository.interface';
import { NotificationChannel } from '@shared/enums/notification.enum';

@Injectable()
export class UserPreferencesRepository implements IUserPreferencesRepository {
  constructor(
    @InjectModel(UserPreferences.name)
    private readonly model: Model<UserPreferencesDocument>,
  ) {}

  async getOrCreate(tenantId: string, userId: string): Promise<UserPreferencesItem> {
    const doc = await this.model.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId), userId: new Types.ObjectId(userId) },
      {
        $setOnInsert: {
          tenantId: new Types.ObjectId(tenantId),
          userId: new Types.ObjectId(userId),
          enabledChannels: [NotificationChannel.IN_APP],
          mutedTypes: [],
          email: { enabled: true, dailyDigest: false, digestHour: 8 },
          announcements: { receiveGlobal: true, receiveTenant: true, receiveCircle: true },
          inApp: { enabled: true, soundEnabled: true },
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true, new: true },
    ).lean();
    return toItem(doc!);
  }

  async updateEmail(
    tenantId: string,
    userId: string,
    input: UpdateEmailPreferencesInput,
  ): Promise<UserPreferencesItem> {
    const update: Record<string, unknown> = {};
    if (input.enabled !== undefined) update['email.enabled'] = input.enabled;
    if (input.dailyDigest !== undefined) update['email.dailyDigest'] = input.dailyDigest;
    if (input.digestHour !== undefined) update['email.digestHour'] = input.digestHour;

    const doc = await this.model.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId), userId: new Types.ObjectId(userId) },
      { $set: update },
      { new: true, upsert: true },
    ).lean();
    return toItem(doc!);
  }

  async updateNotifications(
    tenantId: string,
    userId: string,
    input: UpdateNotificationPreferencesInput,
  ): Promise<UserPreferencesItem> {
    const update: Record<string, unknown> = {};
    if (input.enabledChannels !== undefined) update.enabledChannels = input.enabledChannels;
    if (input.mutedTypes !== undefined) update.mutedTypes = input.mutedTypes;
    if (input.inApp?.enabled !== undefined) update['inApp.enabled'] = input.inApp.enabled;
    if (input.inApp?.soundEnabled !== undefined) update['inApp.soundEnabled'] = input.inApp.soundEnabled;

    const doc = await this.model.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId), userId: new Types.ObjectId(userId) },
      { $set: update },
      { new: true, upsert: true },
    ).lean();
    return toItem(doc!);
  }

  async updateAnnouncements(
    tenantId: string,
    userId: string,
    input: UpdateAnnouncementPreferencesInput,
  ): Promise<UserPreferencesItem> {
    const update: Record<string, unknown> = {};
    if (input.receiveGlobal !== undefined) update['announcements.receiveGlobal'] = input.receiveGlobal;
    if (input.receiveTenant !== undefined) update['announcements.receiveTenant'] = input.receiveTenant;
    if (input.receiveCircle !== undefined) update['announcements.receiveCircle'] = input.receiveCircle;

    const doc = await this.model.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId), userId: new Types.ObjectId(userId) },
      { $set: update },
      { new: true, upsert: true },
    ).lean();
    return toItem(doc!);
  }
}

function toItem(doc: any): UserPreferencesItem {
  return {
    id: String(doc._id),
    tenantId: String(doc.tenantId),
    userId: String(doc.userId),
    enabledChannels: doc.enabledChannels ?? [],
    mutedTypes: doc.mutedTypes ?? [],
    email: doc.email ?? { enabled: true, dailyDigest: false, digestHour: 8 },
    announcements: doc.announcements ?? { receiveGlobal: true, receiveTenant: true, receiveCircle: true },
    inApp: doc.inApp ?? { enabled: true, soundEnabled: true },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
