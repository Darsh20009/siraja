import { EventDispatcherService } from './event-dispatcher.service';
import {
  UserRegisteredEvent,
  StudentCreatedEvent,
  MemorizationRecordedEvent,
  ReviewRecordedEvent,
  MistakeRecordedEvent,
  AttendanceMarkedEvent,
  NotificationCreatedEvent,
} from './domain.events';
import { EVENTS } from './events.constants';

function buildService() {
  const emitter = { emit: jest.fn() };
  const service = new EventDispatcherService(emitter as never);
  return { service, emitter };
}

describe('EventDispatcherService', () => {
  it('userRegistered emits USER_REGISTERED with the event payload', () => {
    const { service, emitter } = buildService();
    const event = new UserRegisteredEvent('u1', 'a@b.com', 'Ahmed', 't1', 'Siraja', 'https://app');
    service.userRegistered(event);
    expect(emitter.emit).toHaveBeenCalledWith(EVENTS.USER_REGISTERED, event);
  });

  it('studentCreated emits STUDENT_CREATED', () => {
    const { service, emitter } = buildService();
    const event = new StudentCreatedEvent('s1', 'Omar', 't1', 'sh1');
    service.studentCreated(event);
    expect(emitter.emit).toHaveBeenCalledWith(EVENTS.STUDENT_CREATED, event);
  });

  it('memorizationRecorded emits MEMORIZATION_RECORDED', () => {
    const { service, emitter } = buildService();
    const event = new MemorizationRecordedEvent('r1', 's1', 't1', 2, 1, 5, 'EXCELLENT');
    service.memorizationRecorded(event);
    expect(emitter.emit).toHaveBeenCalledWith(EVENTS.MEMORIZATION_RECORDED, event);
  });

  it('reviewRecorded emits REVIEW_RECORDED', () => {
    const { service, emitter } = buildService();
    const event = new ReviewRecordedEvent('r1', 's1', 't1', 2, 1, 5, 'GOOD');
    service.reviewRecorded(event);
    expect(emitter.emit).toHaveBeenCalledWith(EVENTS.REVIEW_RECORDED, event);
  });

  it('mistakeRecorded emits MISTAKE_RECORDED', () => {
    const { service, emitter } = buildService();
    const event = new MistakeRecordedEvent('m1', 's1', 't1', 2, 3, 'MISSING_WORD');
    service.mistakeRecorded(event);
    expect(emitter.emit).toHaveBeenCalledWith(EVENTS.MISTAKE_RECORDED, event);
  });

  it('attendanceMarked emits ATTENDANCE_MARKED', () => {
    const { service, emitter } = buildService();
    const event = new AttendanceMarkedEvent('sess1', 't1', 'c1', ['s1', 's2'], '2026-07-14');
    service.attendanceMarked(event);
    expect(emitter.emit).toHaveBeenCalledWith(EVENTS.ATTENDANCE_MARKED, event);
  });

  it('notificationCreated emits NOTIFICATION_CREATED', () => {
    const { service, emitter } = buildService();
    const event = new NotificationCreatedEvent('n1', 'u1', 't1', 'عنوان', 'رسالة', false);
    service.notificationCreated(event);
    expect(emitter.emit).toHaveBeenCalledWith(EVENTS.NOTIFICATION_CREATED, event);
  });

  it('does not throw if emitter.emit throws', () => {
    const { service, emitter } = buildService();
    emitter.emit.mockImplementationOnce(() => { throw new Error('EventEmitter exploded'); });
    const event = new UserRegisteredEvent('u2', 'b@c.com', 'Fatima', 't2', 'Test', 'https://x');
    expect(() => service.userRegistered(event)).not.toThrow();
  });
});
