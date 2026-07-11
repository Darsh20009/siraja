import { NotificationChannel, NotificationType } from '@shared/enums/notification.enum';

export interface UserPreferencesItem {
  id: string;
  tenantId: string;
  userId: string;
  enabledChannels: NotificationChannel[];
  mutedTypes: NotificationType[];
  email: {
    enabled: boolean;
    dailyDigest: boolean;
    digestHour: number;
  };
  announcements: {
    receiveGlobal: boolean;
    receiveTenant: boolean;
    receiveCircle: boolean;
  };
  inApp: {
    enabled: boolean;
    soundEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateEmailPreferencesInput {
  enabled?: boolean;
  dailyDigest?: boolean;
  digestHour?: number;
}

export interface UpdateNotificationPreferencesInput {
  enabledChannels?: NotificationChannel[];
  mutedTypes?: NotificationType[];
  inApp?: { enabled?: boolean; soundEnabled?: boolean };
}

export interface UpdateAnnouncementPreferencesInput {
  receiveGlobal?: boolean;
  receiveTenant?: boolean;
  receiveCircle?: boolean;
}

export interface IUserPreferencesRepository {
  /** Get or create preferences for a user (upsert). */
  getOrCreate(tenantId: string, userId: string): Promise<UserPreferencesItem>;
  updateEmail(tenantId: string, userId: string, input: UpdateEmailPreferencesInput): Promise<UserPreferencesItem>;
  updateNotifications(tenantId: string, userId: string, input: UpdateNotificationPreferencesInput): Promise<UserPreferencesItem>;
  updateAnnouncements(tenantId: string, userId: string, input: UpdateAnnouncementPreferencesInput): Promise<UserPreferencesItem>;
}

export const USER_PREFERENCES_REPOSITORY = Symbol('USER_PREFERENCES_REPOSITORY');
