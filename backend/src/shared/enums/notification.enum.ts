export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  // PUSH and SMS reserved for future phases
}

export enum NotificationType {
  // System
  SYSTEM = 'system',
  // Attendance
  ATTENDANCE = 'attendance',
  // Memorization
  MEMORIZATION = 'memorization',
  MEMORIZATION_PROGRESS = 'memorization_progress',
  // Assignments
  ASSIGNMENT = 'assignment',
  // Exams
  EXAM = 'exam',
  // Parent
  PARENT = 'parent',
  // Circle
  CIRCLE = 'circle',
  // Announcements
  ANNOUNCEMENT = 'announcement',
  // Support / Billing
  SUPPORT = 'support',
  BILLING = 'billing',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}
