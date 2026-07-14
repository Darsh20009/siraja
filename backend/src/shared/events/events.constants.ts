/** Domain event names — used as EventEmitter2 event keys. */
export const EVENTS = {
  USER_REGISTERED: 'user.registered',
  STUDENT_CREATED: 'student.created',
  MEMORIZATION_RECORDED: 'memorization.recorded',
  REVIEW_RECORDED: 'review.recorded',
  MISTAKE_RECORDED: 'mistake.recorded',
  ATTENDANCE_MARKED: 'attendance.marked',
  NOTIFICATION_CREATED: 'notification.created',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
