import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS } from '../events.constants';
import {
  AttendanceMarkedEvent,
  MemorizationRecordedEvent,
  MistakeRecordedEvent,
  NotificationCreatedEvent,
} from '../domain.events';
import { QueueService } from '@shared/queues/queue.service';
import {
  JOB_AI_INSIGHT,
  JOB_NOTIFICATION_IN_APP,
  QUEUE_AI,
  QUEUE_NOTIFICATION,
} from '@shared/queues/queue.constants';

/**
 * NotificationEventListener — translates domain events into notification/AI queue jobs.
 */
@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(private readonly queueService: QueueService) {}

  @OnEvent(EVENTS.MEMORIZATION_RECORDED)
  async onMemorizationRecorded(event: MemorizationRecordedEvent): Promise<void> {
    // Enqueue AI insight generation (non-blocking for the main flow)
    await this.queueService.add(QUEUE_AI, JOB_AI_INSIGHT, {
      tenantId: event.tenantId,
      studentId: event.studentId,
      insightType: 'memorization',
      contextData: {
        recordId: event.recordId,
        surahNumber: event.surahNumber,
        ayahStart: event.ayahStart,
        ayahEnd: event.ayahEnd,
        grade: event.grade,
      },
    });
  }

  @OnEvent(EVENTS.MISTAKE_RECORDED)
  async onMistakeRecorded(event: MistakeRecordedEvent): Promise<void> {
    await this.queueService.add(QUEUE_AI, JOB_AI_INSIGHT, {
      tenantId: event.tenantId,
      studentId: event.studentId,
      insightType: 'mistake',
      contextData: {
        mistakeId: event.mistakeId,
        surahNumber: event.surahNumber,
        ayahNumber: event.ayahNumber,
        mistakeType: event.mistakeType,
      },
    });
  }

  @OnEvent(EVENTS.ATTENDANCE_MARKED)
  async onAttendanceMarked(event: AttendanceMarkedEvent): Promise<void> {
    // Notify each absent student (fire-and-forget per student)
    for (const studentId of event.absentStudentIds) {
      await this.queueService.add(QUEUE_NOTIFICATION, JOB_NOTIFICATION_IN_APP, {
        userId: studentId,
        tenantId: event.tenantId,
        type: 'attendance.absent',
        title: 'تم تسجيل غيابك',
        body: `تم تسجيل غيابك في جلسة بتاريخ ${event.date}.`,
        referenceId: event.sessionId,
        referenceType: 'attendance_session',
      });
    }
  }

  @OnEvent(EVENTS.NOTIFICATION_CREATED)
  async onNotificationCreated(event: NotificationCreatedEvent): Promise<void> {
    await this.queueService.add(QUEUE_NOTIFICATION, JOB_NOTIFICATION_IN_APP, {
      userId: event.userId,
      tenantId: event.tenantId,
      type: 'notification.created',
      title: event.title,
      body: event.body,
      referenceId: event.notificationId,
      referenceType: 'notification',
    });
  }
}
