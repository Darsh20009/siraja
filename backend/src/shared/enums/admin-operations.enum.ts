/**
 * Phase 12E — Administration, Operations & Growth Platform enums.
 */

// ── Donations ────────────────────────────────────────────────────────────────

export enum DonationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  REFUNDED = 'refunded',
}

export enum DonationMethod {
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  ONLINE = 'online',
  OTHER = 'other',
}

export enum CampaignStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

// ── Feedback ─────────────────────────────────────────────────────────────────

export enum FeedbackType {
  GENERAL = 'general',
  BUG_REPORT = 'bug_report',
  IMPROVEMENT = 'improvement',
  COMPLAINT = 'complaint',
  PRAISE = 'praise',
}

export enum FeedbackStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

// ── Feature Voting ────────────────────────────────────────────────────────────

export enum FeatureRequestStatus {
  PROPOSED = 'proposed',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

export enum FeatureRequestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// ── Support ───────────────────────────────────────────────────────────────────
// NOTE: TicketStatus / TicketPriority / TicketCategory / SenderType live in
// @shared/enums/support.enum — do NOT re-declare them here to avoid barrel conflicts.

// ── Audit Log ─────────────────────────────────────────────────────────────────
// NOTE: AuditAction / ActorType / AuditEntityType live in @shared/enums/audit.enum
// — extended there rather than re-declared here.

// ── System Alerts ─────────────────────────────────────────────────────────────

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum AlertType {
  QUEUE_FAILURE = 'queue_failure',
  REDIS_FAILURE = 'redis_failure',
  STORAGE_FAILURE = 'storage_failure',
  EMAIL_FAILURE = 'email_failure',
  AI_FAILURE = 'ai_failure',
  DATABASE_FAILURE = 'database_failure',
  HIGH_ERROR_RATE = 'high_error_rate',
  MEMORY_PRESSURE = 'memory_pressure',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}
