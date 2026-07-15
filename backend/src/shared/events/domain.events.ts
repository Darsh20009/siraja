/** Domain event payload classes. Pure value objects — no methods, no DI. */

export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly tenantId: string,
    public readonly tenantName: string,
    public readonly loginUrl: string,
  ) {}
}

export class StudentCreatedEvent {
  constructor(
    public readonly studentId: string,
    public readonly studentName: string,
    public readonly tenantId: string,
    public readonly assignedSheikhId?: string,
  ) {}
}

export class MemorizationRecordedEvent {
  constructor(
    public readonly recordId: string,
    public readonly studentId: string,
    public readonly tenantId: string,
    public readonly surahNumber: number,
    public readonly ayahStart: number,
    public readonly ayahEnd: number,
    public readonly grade: string,
  ) {}
}

export class ReviewRecordedEvent {
  constructor(
    public readonly recordId: string,
    public readonly studentId: string,
    public readonly tenantId: string,
    public readonly surahNumber: number,
    public readonly ayahStart: number,
    public readonly ayahEnd: number,
    public readonly grade: string,
  ) {}
}

export class MistakeRecordedEvent {
  constructor(
    public readonly mistakeId: string,
    public readonly studentId: string,
    public readonly tenantId: string,
    public readonly surahNumber: number,
    public readonly ayahNumber: number,
    public readonly mistakeType: string,
  ) {}
}

export class AttendanceMarkedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly tenantId: string,
    public readonly circleId: string,
    public readonly absentStudentIds: string[],
    public readonly date: string,
  ) {}
}

// ── Phase 12D — Gamification ──────────────────────────────────────────────────

export class ExamCompletedEvent {
  constructor(
    public readonly examId: string,
    public readonly studentId: string,
    public readonly tenantId: string,
    public readonly grade: string,
    public readonly score: number,
    public readonly passed: boolean,
  ) {}
}

export class PointsAwardedEvent {
  constructor(
    public readonly studentId: string,
    public readonly tenantId: string,
    public readonly activityType: string,
    public readonly points: number,
    public readonly totalPoints: number,
  ) {}
}

export class AchievementUnlockedEvent {
  constructor(
    public readonly studentId: string,
    public readonly tenantId: string,
    public readonly achievementType: string,
    public readonly achievementName: string,
  ) {}
}

export class BadgeAwardedEvent {
  constructor(
    public readonly studentId: string,
    public readonly tenantId: string,
    public readonly badgeName: string,
    public readonly badgeTier: string,
  ) {}
}

export class NotificationCreatedEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly title: string,
    public readonly body: string,
    public readonly deliverViaEmail: boolean,
    public readonly recipientEmail?: string,
  ) {}
}
