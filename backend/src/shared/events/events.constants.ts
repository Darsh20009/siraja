/** Domain event names — used as EventEmitter2 event keys. */
export const EVENTS = {
  USER_REGISTERED: 'user.registered',
  STUDENT_CREATED: 'student.created',
  MEMORIZATION_RECORDED: 'memorization.recorded',
  REVIEW_RECORDED: 'review.recorded',
  MISTAKE_RECORDED: 'mistake.recorded',
  ATTENDANCE_MARKED: 'attendance.marked',
  NOTIFICATION_CREATED: 'notification.created',
  // Phase 12D — Gamification
  EXAM_COMPLETED: 'exam.completed',
  POINTS_AWARDED: 'points.awarded',
  ACHIEVEMENT_UNLOCKED: 'achievement.unlocked',
  BADGE_AWARDED: 'badge.awarded',
  // Phase 12E — Administration, Operations & Growth
  DONATION_CREATED: 'donation.created',
  DONATION_CONFIRMED: 'donation.confirmed',
  FEEDBACK_SUBMITTED: 'feedback.submitted',
  FEATURE_REQUEST_CREATED: 'feature_request.created',
  FEATURE_REQUEST_STATUS_CHANGED: 'feature_request.status_changed',
  TICKET_CREATED: 'ticket.created',
  TICKET_RESOLVED: 'ticket.resolved',
  SYSTEM_ALERT_FIRED: 'system_alert.fired',
  AUDIT_LOG_CREATED: 'audit_log.created',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
