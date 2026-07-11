import { AnnouncementScope, AnnouncementStatus } from '@shared/enums/announcement.enum';
import { NotificationPriority } from '@shared/enums/notification.enum';

export interface AnnouncementItem {
  id: string;
  tenantId: string;
  scope: AnnouncementScope;
  scopedTenantId?: string | null;
  circleId?: string;
  title: string;
  body: string;
  htmlBody?: string;
  priority: NotificationPriority;
  status: AnnouncementStatus;
  createdById: string;
  publishedAt?: Date;
  expiresAt?: Date;
  deepLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAnnouncementInput {
  tenantId: string;
  scope: AnnouncementScope;
  scopedTenantId?: string | null;
  circleId?: string;
  title: string;
  body: string;
  htmlBody?: string;
  priority?: NotificationPriority;
  createdById: string;
  expiresAt?: Date;
  deepLink?: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  body?: string;
  htmlBody?: string;
  priority?: NotificationPriority;
  expiresAt?: Date;
  deepLink?: string;
}

export interface AnnouncementListFilter {
  scope?: AnnouncementScope;
  circleId?: string;
  status?: AnnouncementStatus;
  createdById?: string;
}

export interface IAnnouncementRepository {
  create(input: CreateAnnouncementInput): Promise<AnnouncementItem>;
  findById(tenantId: string, id: string): Promise<AnnouncementItem | null>;
  findAll(
    tenantId: string,
    filter: AnnouncementListFilter,
    page?: number,
    limit?: number,
  ): Promise<{ items: AnnouncementItem[]; total: number }>;
  /**
   * Published, non-expired announcements visible to a caller.
   *
   * CIRCLE scope is ONLY included when `circleId` is explicitly provided by
   * the caller — this prevents cross-circle disclosure where a user sees
   * circle announcements they do not belong to. Callers must pass their own
   * circleId; the controller obtains it from the request query parameter and
   * the caller is responsible for only passing circles they actually belong to
   * (enforced at the application layer for their role).
   *
   * Without `circleId`: returns GLOBAL + TENANT announcements only.
   * With `circleId`:    returns GLOBAL + TENANT + that one CIRCLE's announcements.
   */
  findVisible(tenantId: string, circleId?: string, page?: number, limit?: number): Promise<{ items: AnnouncementItem[]; total: number }>;
  update(tenantId: string, id: string, input: UpdateAnnouncementInput): Promise<AnnouncementItem>;
  publish(tenantId: string, id: string): Promise<AnnouncementItem>;
  archive(tenantId: string, id: string): Promise<AnnouncementItem>;
  delete(tenantId: string, id: string): Promise<void>;
}

export const ANNOUNCEMENT_REPOSITORY = Symbol('ANNOUNCEMENT_REPOSITORY');
