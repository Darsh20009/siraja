import { NotificationChannel, NotificationPriority, NotificationStatus, NotificationType } from '@shared/enums/notification.enum';

export interface NotificationItem {
  id: string;
  tenantId: string;
  recipientId: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  priority: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  deepLink?: string;
  isRead: boolean;
  readAt?: Date | null;
  isArchived: boolean;
  archivedAt?: Date | null;
  templateId?: string;
  actorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationInput {
  tenantId: string;
  recipientId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  deepLink?: string;
  templateId?: string;
  actorId?: string;
}

export interface NotificationListFilter {
  recipientId?: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  isRead?: boolean;
  isArchived?: boolean;
  priority?: NotificationPriority;
}

export interface INotificationRepository {
  create(input: CreateNotificationInput): Promise<NotificationItem>;
  createMany(inputs: CreateNotificationInput[]): Promise<NotificationItem[]>;
  findById(tenantId: string, id: string): Promise<NotificationItem | null>;
  findAll(
    tenantId: string,
    filter: NotificationListFilter,
    page?: number,
    limit?: number,
  ): Promise<{ items: NotificationItem[]; total: number; unreadCount: number }>;
  markRead(tenantId: string, id: string): Promise<NotificationItem>;
  markAllRead(tenantId: string, recipientId: string): Promise<number>;
  archive(tenantId: string, id: string): Promise<NotificationItem>;
  delete(tenantId: string, id: string): Promise<void>;
  countUnread(tenantId: string, recipientId: string): Promise<number>;
  updateStatus(tenantId: string, id: string, status: NotificationStatus): Promise<NotificationItem>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
