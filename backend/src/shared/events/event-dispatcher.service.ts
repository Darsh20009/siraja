import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from './events.constants';
import {
  UserRegisteredEvent,
  StudentCreatedEvent,
  MemorizationRecordedEvent,
  ReviewRecordedEvent,
  MistakeRecordedEvent,
  AttendanceMarkedEvent,
  NotificationCreatedEvent,
  ExamCompletedEvent,
  PointsAwardedEvent,
  AchievementUnlockedEvent,
  BadgeAwardedEvent,
} from './domain.events';

/**
 * EventDispatcherService — typed facade over EventEmitter2.
 *
 * Use-case layer injects this service and calls strongly-typed emit methods.
 * Event listeners (in EventsModule) react asynchronously — no coupling back
 * to the emitting use case.
 *
 * All emits are fire-and-forget: this.emitter.emit() is synchronous in
 * EventEmitter2 (listeners run in the same tick for sync listeners, or are
 * scheduled for async/promise-based ones). Errors in listeners are caught
 * globally by EventEmitter2's error handler.
 */
@Injectable()
export class EventDispatcherService {
  private readonly logger = new Logger(EventDispatcherService.name);

  constructor(private readonly emitter: EventEmitter2) {}

  userRegistered(event: UserRegisteredEvent): void {
    this.dispatch(EVENTS.USER_REGISTERED, event);
  }

  studentCreated(event: StudentCreatedEvent): void {
    this.dispatch(EVENTS.STUDENT_CREATED, event);
  }

  memorizationRecorded(event: MemorizationRecordedEvent): void {
    this.dispatch(EVENTS.MEMORIZATION_RECORDED, event);
  }

  reviewRecorded(event: ReviewRecordedEvent): void {
    this.dispatch(EVENTS.REVIEW_RECORDED, event);
  }

  mistakeRecorded(event: MistakeRecordedEvent): void {
    this.dispatch(EVENTS.MISTAKE_RECORDED, event);
  }

  attendanceMarked(event: AttendanceMarkedEvent): void {
    this.dispatch(EVENTS.ATTENDANCE_MARKED, event);
  }

  notificationCreated(event: NotificationCreatedEvent): void {
    this.dispatch(EVENTS.NOTIFICATION_CREATED, event);
  }

  examCompleted(event: ExamCompletedEvent): void {
    this.dispatch(EVENTS.EXAM_COMPLETED, event);
  }

  pointsAwarded(event: PointsAwardedEvent): void {
    this.dispatch(EVENTS.POINTS_AWARDED, event);
  }

  achievementUnlocked(event: AchievementUnlockedEvent): void {
    this.dispatch(EVENTS.ACHIEVEMENT_UNLOCKED, event);
  }

  badgeAwarded(event: BadgeAwardedEvent): void {
    this.dispatch(EVENTS.BADGE_AWARDED, event);
  }

  private dispatch(eventName: string, payload: object): void {
    try {
      this.emitter.emit(eventName, payload);
    } catch (err: unknown) {
      // Emitter itself should never throw; listeners handle their own errors.
      this.logger.error(
        `EventDispatcher: failed to emit "${eventName}": ${(err as Error).message}`,
      );
    }
  }
}
