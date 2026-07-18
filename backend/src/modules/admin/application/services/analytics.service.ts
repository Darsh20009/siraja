import { Injectable, Inject } from '@nestjs/common';
import { OPERATIONAL_SNAPSHOT_REPOSITORY, IOperationalSnapshotRepository } from '../../domain/repositories/operational-snapshot.repository.interface';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(OPERATIONAL_SNAPSHOT_REPOSITORY) private readonly snapshotRepo: IOperationalSnapshotRepository,
  ) {}

  // ── User growth ───────────────────────────────────────────────────────────

  async getUserGrowth(days = 30) {
    const { from, to, snapshots } = await this.getSnapshots(days);
    return {
      period: { from, to, days },
      data: snapshots.map(s => ({ date: s.date, newUsers: s.newUsersToday, total: s.totalUsers })),
    };
  }

  // ── Active users: DAU / WAU / MAU ─────────────────────────────────────────

  async getDailyActiveUsers(days = 30) {
    const { from, to, snapshots } = await this.getSnapshots(days);
    return {
      period: { from, to, days },
      data: snapshots.map(s => ({ date: s.date, dau: s.dailyActiveUsers })),
    };
  }

  async getWeeklyActiveUsers(weeks = 12) {
    const days = weeks * 7;
    const { from, to, snapshots } = await this.getSnapshots(days);

    // Bucket daily snapshots into ISO weeks and take the max DAU seen in each week
    const weekBuckets: Record<string, { weekStart: string; maxDau: number; avgDau: number; samples: number }> = {};
    for (const s of snapshots) {
      const d = new Date(s.date + 'T00:00:00Z');
      // Monday-anchored ISO week start
      const day = d.getUTCDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const weekStart = new Date(d);
      weekStart.setUTCDate(d.getUTCDate() + diff);
      const key = weekStart.toISOString().split('T')[0];
      if (!weekBuckets[key]) weekBuckets[key] = { weekStart: key, maxDau: 0, avgDau: 0, samples: 0 };
      const bucket = weekBuckets[key];
      bucket.maxDau = Math.max(bucket.maxDau, s.dailyActiveUsers);
      bucket.avgDau = ((bucket.avgDau * bucket.samples) + s.dailyActiveUsers) / (bucket.samples + 1);
      bucket.samples++;
    }

    return {
      period: { from, to, weeks },
      data: Object.values(weekBuckets)
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
        .map(b => ({ weekStart: b.weekStart, maxDau: b.maxDau, avgDau: Math.round(b.avgDau) })),
    };
  }

  async getMonthlyActiveUsers(months = 6) {
    const days = months * 31;
    const { from, to, snapshots } = await this.getSnapshots(days);

    // Bucket into calendar months — MAU = unique active users proxy (sum of DAU / avg days in month)
    const monthBuckets: Record<string, { month: string; totalDau: number; samples: number; peakDau: number }> = {};
    for (const s of snapshots) {
      const key = s.date.substring(0, 7); // YYYY-MM
      if (!monthBuckets[key]) monthBuckets[key] = { month: key, totalDau: 0, samples: 0, peakDau: 0 };
      const bucket = monthBuckets[key];
      bucket.totalDau += s.dailyActiveUsers;
      bucket.samples++;
      bucket.peakDau = Math.max(bucket.peakDau, s.dailyActiveUsers);
    }

    return {
      period: { from, to, months },
      data: Object.values(monthBuckets)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(b => ({
          month: b.month,
          mauProxy: b.totalDau,   // sum of DAU across all active days (conservative MAU proxy)
          avgDau: b.samples > 0 ? Math.round(b.totalDau / b.samples) : 0,
          peakDau: b.peakDau,
          activeDays: b.samples,
        })),
    };
  }

  // ── Engagement ────────────────────────────────────────────────────────────

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

  // ── Retention ─────────────────────────────────────────────────────────────

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

  // ── Platform growth ───────────────────────────────────────────────────────

  async getPlatformGrowth(days = 30) {
    const { from, to, snapshots } = await this.getSnapshots(days);
    return {
      period: { from, to, days },
      data: snapshots.map(s => ({
        date: s.date,
        totalUsers: s.totalUsers,
        totalStudents: s.totalStudents,
        totalTenants: s.totalTenants,
        newUsers: s.newUsersToday,
        newStudents: s.newStudentsToday,
        newTenants: s.newTenantsToday,
      })),
    };
  }

  // ── Infrastructure usage ──────────────────────────────────────────────────

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
        aiRequests: s.dailyAiRequests,
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

  // ── Private helpers ───────────────────────────────────────────────────────

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
