import { NotificationChannel, NotificationType } from '@shared/enums/notification.enum';

export interface NotificationTemplateItem {
  id: string;
  tenantId?: string | null;
  name: string;
  description?: string;
  type: NotificationType;
  channel: NotificationChannel;
  titleTemplate: string;
  bodyTemplate: string;
  htmlBodyTemplate?: string;
  variables: string[];
  isActive: boolean;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationTemplateInput {
  tenantId?: string | null;
  name: string;
  description?: string;
  type: NotificationType;
  channel: NotificationChannel;
  titleTemplate: string;
  bodyTemplate: string;
  htmlBodyTemplate?: string;
  variables?: string[];
  createdById?: string;
}

export interface UpdateNotificationTemplateInput {
  name?: string;
  description?: string;
  titleTemplate?: string;
  bodyTemplate?: string;
  htmlBodyTemplate?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface INotificationTemplateRepository {
  create(input: CreateNotificationTemplateInput): Promise<NotificationTemplateItem>;
  /**
   * Look up a template by its ID.
   *
   * tenantId scoping (defense in depth):
   *   - Pass `tenantId` for ordinary callers: only returns the template if it is
   *     global (tenantId = null) OR belongs to the caller's tenant.
   *   - Pass `null` for Super Admin: returns any template regardless of tenant.
   */
  findById(id: string, tenantId?: string | null): Promise<NotificationTemplateItem | null>;
  findAll(
    tenantId: string | null,
    type?: NotificationType,
    channel?: NotificationChannel,
    page?: number,
    limit?: number,
  ): Promise<{ items: NotificationTemplateItem[]; total: number }>;
  /** Resolve the best template: tenant-specific overrides global default. */
  resolve(tenantId: string, type: NotificationType, channel: NotificationChannel): Promise<NotificationTemplateItem | null>;
  update(id: string, input: UpdateNotificationTemplateInput): Promise<NotificationTemplateItem>;
  delete(id: string): Promise<void>;
  render(template: NotificationTemplateItem, variables: Record<string, string>): { title: string; body: string; htmlBody?: string };
}

export const NOTIFICATION_TEMPLATE_REPOSITORY = Symbol('NOTIFICATION_TEMPLATE_REPOSITORY');
