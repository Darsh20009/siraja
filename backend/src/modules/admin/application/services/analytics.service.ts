import { Injectable, Inject } from '@nestjs/common';
import { OPERATIONAL_SNAPSHOT_REPOSITORY, IOperationalSnapshotRepository } from '../../domain/repositories/operational-snapshot.repository.interface';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(OPERATIONAL_SNAPSHOT_REPOSITORY) private readonly snapshotRepo: IOperationalSnapshotRepository,
  ) {}

  async getUserGrowth(days = 30) {
    const { from, to, snapshots } = await this.getSnapshots(days);
    return {
      period: { from, to, days },
      data: snapshots.map(s => ({ date: s.date, newUsers: s.newUsersToday, total: s.totalUsers })),
    };
  }

  async getEngagementTrend(days = 30) {
    const { from, to, snapshots } = await this.getSnapshots(days);
    return {
      period: { from, to, days },
      data: snapshots.map(s => ({
        date: s.date,
        activeUsers: s.dailyActiveUsers,
        memorizations: s.dailyMemorizationRecords,
        reviews: s.dailyReviewRecords,
        aiRequests: s.dailyAiRequests,
      })),
    };
  }

  async getRetentionProxy(days = 30) {
    const { snapshots } = await this.getSnapshots(days);
    if (snapshots.length < 2) return { retentionRate: null, note: 'Insufficient data' };

    const avgActive = snapshots.reduce((s, snap) => s + snap.dailyActiveUsers, 0) / snapshots.length;
    const latest = snapshots[snapshots.length - 1];
    const retentionRate = latest.totalUsers > 0
      ? Math.round((avgActive / latest.totalUsers) * 100)
      : null;

    return { avgDailyActiveUsers: Math.round(avgActive), totalUsers: latest.totalUsers, retentionRate };
  }

  async getPlatformUsageTrend(days = 30) {
    const { from, to, snapshots } = await this.getSnapshots(days);
    return {
      period: { from, to, days },
      data: snapshots.map(s => ({
        date: s.date,
        storageUsedMb: s.storageUsedMb,
        emailsSent: s.emailsSentToday,
        queueJobsProcessed: s.queueJobsProcessed,
        queueJobsFailed: s.queueJobsFailed,
      })),
    };
  }

  async getDonationTrend(days = 30) {
    const { from, to, snapshots } = await this.getSnapshots(days);
    return {
      period: { from, to, days },
      data: snapshots.map(s => ({
        date: s.date,
        donations: s.totalDonationsToday,
        amount: s.totalDonationAmountToday,
        cumulative: s.cumulativeDonationAmount,
      })),
    };
  }

  private async getSnapshots(days: number) {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().split('T')[0];
    const toStr = today.toISOString().split('T')[0];
    const snapshots = await this.snapshotRepo.findRange(fromStr, toStr);
    return { from: fromStr, to: toStr, snapshots };
  }
}
