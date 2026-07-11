/**
 * Enums for the Announcements system (Phase 10).
 */

export enum AnnouncementScope {
  /** Visible to all tenants — Super Admin only */
  GLOBAL = 'global',
  /** Visible to all users in one tenant — Tenant Admin only */
  TENANT = 'tenant',
  /** Visible to members of one circle — Sheikh or Supervisor */
  CIRCLE = 'circle',
}

export enum AnnouncementStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}
