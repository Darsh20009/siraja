export enum NotificationChannel {
  IN_APP = 'in_app',
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
}

export enum NotificationType {
  ATTENDANCE = 'attendance',
  MEMORIZATION_PROGRESS = 'memorization_progress',
  EXAM = 'exam',
  ASSIGNMENT = 'assignment',
  ANNOUNCEMENT = 'announcement',
  SUPPORT = 'support',
  BILLING = 'billing',
  SYSTEM = 'system',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}
