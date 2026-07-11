/**
 * Enums for the In-App Messaging system (Phase 10).
 */

export enum ThreadType {
  /** Sheikh writes to a single student */
  SHEIKH_STUDENT = 'sheikh_student',
  /** Sheikh writes to a student's parent */
  SHEIKH_PARENT = 'sheikh_parent',
  /** Tenant Admin broadcasts to one or many users */
  ADMIN_USER = 'admin_user',
  /** Supervisor writes to all members of a circle */
  SUPERVISOR_CIRCLE = 'supervisor_circle',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}
