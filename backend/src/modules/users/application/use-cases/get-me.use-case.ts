import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserPreferences, UserPreferencesDocument } from '@database/mongoose/schemas';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UserProfileResponse, NotificationPreferencesDto } from '../dto/user-profile.response';
import { NotificationChannel, NotificationType } from '@shared/enums/notification.enum';

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @InjectModel(UserPreferences.name) private readonly prefsModel: Model<UserPreferencesDocument>,
  ) {}

  async execute(tenantId: string, userId: string): Promise<UserProfileResponse> {
    const user = await this.users.findById(tenantId, userId);
    if (!user) throw new NotFoundException('User not found.');

    const prefs = await this.prefsModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId),
    });

    const notificationPreferences: NotificationPreferencesDto = {
      enabledChannels: (prefs?.enabledChannels as NotificationChannel[]) ?? [NotificationChannel.IN_APP],
      mutedTypes: (prefs?.mutedTypes as NotificationType[]) ?? [],
      emailEnabled: prefs?.email?.enabled ?? true,
      emailDailyDigest: prefs?.email?.dailyDigest ?? false,
      emailDigestHour: prefs?.email?.digestHour ?? 8,
      inAppEnabled: prefs?.inApp?.enabled ?? true,
      inAppSoundEnabled: prefs?.inApp?.soundEnabled ?? true,
    };

    return {
      id: (user._id as Types.ObjectId).toHexString(),
      tenantId: String(user.tenantId),
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      roles: user.roles,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      preferredLocale: user.preferredLocale ?? 'ar',
      lastLoginAt: user.lastLoginAt ?? undefined,
      isMfaEnabled: user.isMfaEnabled,
      notificationPreferences,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };
  }
}
