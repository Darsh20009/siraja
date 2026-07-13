import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Inject } from '@nestjs/common';
import { User, UserPreferences, UserPreferencesDocument } from '@database/mongoose/schemas';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';

@Injectable()
export class UpdateNotificationPreferencesUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @InjectModel(UserPreferences.name) private readonly prefsModel: Model<UserPreferencesDocument>,
  ) {}

  async execute(
    tenantId: string,
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<{ message: string }> {
    const user = await this.users.findById(tenantId, userId);
    if (!user) throw new NotFoundException('User not found.');

    const tid = new Types.ObjectId(tenantId);
    const uid = new Types.ObjectId(userId);

    const updateFields: Record<string, unknown> = {};

    if (dto.enabledChannels !== undefined) updateFields['enabledChannels'] = dto.enabledChannels;
    if (dto.mutedTypes !== undefined) updateFields['mutedTypes'] = dto.mutedTypes;
    if (dto.emailEnabled !== undefined) updateFields['email.enabled'] = dto.emailEnabled;
    if (dto.emailDailyDigest !== undefined) updateFields['email.dailyDigest'] = dto.emailDailyDigest;
    if (dto.emailDigestHour !== undefined) updateFields['email.digestHour'] = dto.emailDigestHour;
    if (dto.inAppEnabled !== undefined) updateFields['inApp.enabled'] = dto.inAppEnabled;
    if (dto.inAppSoundEnabled !== undefined) updateFields['inApp.soundEnabled'] = dto.inAppSoundEnabled;

    await this.prefsModel.findOneAndUpdate(
      { tenantId: tid, userId: uid },
      { $set: { ...updateFields, tenantId: tid, userId: uid } },
      { upsert: true, new: true },
    );

    return { message: 'Notification preferences updated.' };
  }
}
