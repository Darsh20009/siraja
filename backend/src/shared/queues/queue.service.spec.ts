import { QueueService } from './queue.service';
import { QUEUE_AI, QUEUE_EMAIL, QUEUE_NOTIFICATION, QUEUE_REPORT, QUEUE_AUDIO, JOB_EMAIL_WELCOME, JOB_AI_INSIGHT } from './queue.constants';

function buildQueue(addResult: Promise<unknown> = Promise.resolve()) {
  return {
    add: jest.fn().mockReturnValue(addResult),
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getCompletedCount: jest.fn().mockResolvedValue(5),
    getFailedCount: jest.fn().mockResolvedValue(0),
    getDelayedCount: jest.fn().mockResolvedValue(0),
    isPaused: jest.fn().mockResolvedValue(false),
  };
}

describe('QueueService', () => {
  describe('when queues are available (Redis configured)', () => {
    let service: QueueService;
    let emailQueue: ReturnType<typeof buildQueue>;
    let aiQueue: ReturnType<typeof buildQueue>;

    beforeEach(() => {
      emailQueue = buildQueue();
      aiQueue = buildQueue();
      service = new QueueService(
        aiQueue as never,
        emailQueue as never,
        buildQueue() as never,
        buildQueue() as never,
        buildQueue() as never,
      );
    });

    it('add() enqueues a job on the correct queue', async () => {
      const result = await service.add(QUEUE_EMAIL, JOB_EMAIL_WELCOME, { to: 'a@b.com' });
      expect(result).toBe(true);
      expect(emailQueue.add).toHaveBeenCalledWith(
        JOB_EMAIL_WELCOME,
        { to: 'a@b.com' },
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('add() returns false and logs warning on queue error', async () => {
      emailQueue.add.mockRejectedValueOnce(new Error('Redis gone'));
      const result = await service.add(QUEUE_EMAIL, JOB_EMAIL_WELCOME, {});
      expect(result).toBe(false);
    });

    it('addCritical() uses more retries', async () => {
      await service.addCritical(QUEUE_AI, JOB_AI_INSIGHT, { tenantId: 't1' });
      expect(aiQueue.add).toHaveBeenCalledWith(
        JOB_AI_INSIGHT,
        { tenantId: 't1' },
        expect.objectContaining({ attempts: 5 }),
      );
    });

    it('getStats() returns stats for all registered queues', async () => {
      const stats = await service.getStats();
      expect(stats.some((s) => s.name === QUEUE_EMAIL)).toBe(true);
      expect(stats.some((s) => s.name === QUEUE_AI)).toBe(true);
    });

    it('isAvailable() returns true for registered queue', () => {
      expect(service.isAvailable(QUEUE_EMAIL)).toBe(true);
    });

    it('registeredQueues lists all queues passed to constructor', () => {
      expect(service.registeredQueues).toEqual(
        expect.arrayContaining([QUEUE_AI, QUEUE_EMAIL, QUEUE_NOTIFICATION, QUEUE_REPORT, QUEUE_AUDIO]),
      );
    });
  });

  describe('when queues are unavailable (no Redis)', () => {
    let service: QueueService;

    beforeEach(() => {
      service = new QueueService(null, null, null, null, null);
    });

    it('add() returns false and does not throw', async () => {
      const result = await service.add(QUEUE_EMAIL, JOB_EMAIL_WELCOME, {});
      expect(result).toBe(false);
    });

    it('getStats() returns -1 placeholders for all queues', async () => {
      const stats = await service.getStats();
      expect(stats.every((s) => s.waiting === -1)).toBe(true);
    });

    it('isAvailable() returns false for all queues', () => {
      expect(service.isAvailable(QUEUE_EMAIL)).toBe(false);
      expect(service.isAvailable(QUEUE_AI)).toBe(false);
    });

    it('registeredQueues is empty', () => {
      expect(service.registeredQueues).toHaveLength(0);
    });
  });
});
