import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  ALL_QUEUES,
  DEFAULT_JOB_OPTIONS,
  CRITICAL_JOB_OPTIONS,
  QueueName,
  QUEUE_AI,
  QUEUE_EMAIL,
  QUEUE_NOTIFICATION,
  QUEUE_REPORT,
  QUEUE_AUDIO,
} from './queue.constants';

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * QueueService — unified interface for enqueueing jobs across all BullMQ queues.
 *
 * Graceful fallback: if a queue is unavailable (e.g. Redis not configured),
 * the add() call logs a warning and resolves without throwing, so the calling
 * use-case can continue synchronously.
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues: Map<string, Queue>;

  constructor(
    @Optional() @InjectQueue(QUEUE_AI) private readonly aiQueue: Queue | null,
    @Optional() @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue | null,
    @Optional() @InjectQueue(QUEUE_NOTIFICATION) private readonly notificationQueue: Queue | null,
    @Optional() @InjectQueue(QUEUE_REPORT) private readonly reportQueue: Queue | null,
    @Optional() @InjectQueue(QUEUE_AUDIO) private readonly audioQueue: Queue | null,
  ) {
    this.queues = new Map<string, Queue>();
    const pairs: [string, Queue | null][] = [
      [QUEUE_AI, aiQueue],
      [QUEUE_EMAIL, emailQueue],
      [QUEUE_NOTIFICATION, notificationQueue],
      [QUEUE_REPORT, reportQueue],
      [QUEUE_AUDIO, audioQueue],
    ];
    for (const [name, q] of pairs) {
      if (q) this.queues.set(name, q);
    }
  }

  /**
   * Enqueue a job with default retry + exponential-backoff settings.
   * Returns false (instead of throwing) when the queue is unavailable.
   */
  async add(
    queueName: QueueName,
    jobName: string,
    data: unknown,
    opts?: Partial<typeof DEFAULT_JOB_OPTIONS>,
  ): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      this.logger.warn(
        `Queue "${queueName}" unavailable — job "${jobName}" dropped. ` +
          'Configure REDIS_URL to enable queuing.',
      );
      return false;
    }
    try {
      await queue.add(jobName, data, { ...DEFAULT_JOB_OPTIONS, ...opts });
      return true;
    } catch (err: unknown) {
      this.logger.error(
        `Failed to enqueue "${jobName}" on "${queueName}": ${(err as Error).message}`,
      );
      return false;
    }
  }

  /** Enqueue a critical job (more retries, higher priority, longer backoff). */
  async addCritical(
    queueName: QueueName,
    jobName: string,
    data: unknown,
  ): Promise<boolean> {
    return this.add(queueName, jobName, data, CRITICAL_JOB_OPTIONS);
  }

  /** Enqueue a delayed job (fires after `delayMs` milliseconds). */
  async addDelayed(
    queueName: QueueName,
    jobName: string,
    data: unknown,
    delayMs: number,
  ): Promise<boolean> {
    return this.add(queueName, jobName, data, { ...DEFAULT_JOB_OPTIONS, delay: delayMs } as never);
  }

  // ─── Monitoring ──────────────────────────────────────────────────────────

  async getStats(): Promise<QueueStats[]> {
    const stats: QueueStats[] = [];
    for (const [name, queue] of this.queues.entries()) {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);
        const paused = await queue.isPaused();
        stats.push({ name, waiting, active, completed, failed, delayed, paused });
      } catch {
        stats.push({ name, waiting: -1, active: -1, completed: -1, failed: -1, delayed: -1, paused: false });
      }
    }
    // For queues not registered (Redis unavailable), add placeholder rows
    for (const queueName of ALL_QUEUES) {
      if (!this.queues.has(queueName)) {
        stats.push({ name: queueName, waiting: -1, active: -1, completed: -1, failed: -1, delayed: -1, paused: true });
      }
    }
    return stats;
  }

  isAvailable(queueName: QueueName): boolean {
    return this.queues.has(queueName);
  }

  get registeredQueues(): string[] {
    return [...this.queues.keys()];
  }
}
