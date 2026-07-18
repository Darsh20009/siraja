import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DashboardService } from './dashboard.service';

/**
 * SnapshotScheduler — captures a daily operational snapshot at midnight UTC.
 *
 * The snapshot is a cheap, denormalised cache of platform-wide counters
 * that powers the admin dashboard and analytics without live aggregations.
 * Safe to run multiple times on the same day (DashboardService.captureSnapshot
 * uses upsert, so re-runs are idempotent).
 */
@Injectable()
export class SnapshotScheduler {
  private readonly logger = new Logger(SnapshotScheduler.name);

  constructor(private readonly dashboardService: DashboardService) {}

  /** Runs daily at 00:05 UTC — 5-minute offset avoids exact-midnight contention. */
  @Cron('5 0 * * *', { name: 'daily-snapshot', timeZone: 'UTC' })
  async captureDaily() {
    this.logger.log('Running daily operational snapshot...');
    try {
      await this.dashboardService.captureSnapshot();
      this.logger.log('Daily snapshot completed successfully.');
    } catch (err) {
      this.logger.error('Daily snapshot failed', err instanceof Error ? err.stack : String(err));
    }
  }
}
