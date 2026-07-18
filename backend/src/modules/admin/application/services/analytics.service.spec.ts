import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { OPERATIONAL_SNAPSHOT_REPOSITORY } from '../../domain/repositories/operational-snapshot.repository.interface';

const mockSnapshotRepo = () => ({
  findRange: jest.fn(),
  findLatest: jest.fn(),
  create: jest.fn(),
});

const buildSnapshot = (date: string, overrides: Record<string, number> = {}) => ({
  date,
  totalUsers: 100,
  totalStudents: 40,
  totalTenants: 5,
  newUsersToday: 5,
  newStudentsToday: 2,
  newTenantsToday: 0,
  dailyActiveUsers: 40,
  dailyMemorizationRecords: 20,
  dailyReviewRecords: 15,
  dailyAiRequests: 8,
  storageUsedMb: 500,
  emailsSentToday: 10,
  queueJobsProcessed: 50,
  queueJobsFailed: 2,
  totalDonationsToday: 3,
  totalDonationAmountToday: 300,
  cumulativeDonationAmount: 5000,
  ...overrides,
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let repo: ReturnType<typeof mockSnapshotRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: OPERATIONAL_SNAPSHOT_REPOSITORY, useFactory: mockSnapshotRepo },
      ],
    }).compile();

    service = module.get(AnalyticsService);
    repo    = module.get(OPERATIONAL_SNAPSHOT_REPOSITORY);
  });

  // ── getUserGrowth ─────────────────────────────────────────────────────────

  describe('getUserGrowth', () => {
    it('returns period metadata and daily data', async () => {
      repo.findRange.mockResolvedValue([
        buildSnapshot('2026-07-01'),
        buildSnapshot('2026-07-02', { newUsersToday: 10, totalUsers: 110 }),
      ]);

      const result = await service.getUserGrowth(7);

      expect(result.period.days).toBe(7);
      expect(result.data).toHaveLength(2);
      expect(result.data[1].newUsers).toBe(10);
    });
  });

  // ── getWeeklyActiveUsers ──────────────────────────────────────────────────

  describe('getWeeklyActiveUsers', () => {
    it('buckets daily snapshots into weeks', async () => {
      // 2026-07-13 is a Monday
      repo.findRange.mockResolvedValue([
        buildSnapshot('2026-07-13', { dailyActiveUsers: 30 }),
        buildSnapshot('2026-07-14', { dailyActiveUsers: 50 }),
        buildSnapshot('2026-07-15', { dailyActiveUsers: 40 }),
      ]);

      const result = await service.getWeeklyActiveUsers(4);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].weekStart).toBe('2026-07-13');
      expect(result.data[0].maxDau).toBe(50);
    });
  });

  // ── getMonthlyActiveUsers ─────────────────────────────────────────────────

  describe('getMonthlyActiveUsers', () => {
    it('buckets daily snapshots into months', async () => {
      repo.findRange.mockResolvedValue([
        buildSnapshot('2026-06-28', { dailyActiveUsers: 40 }),
        buildSnapshot('2026-06-29', { dailyActiveUsers: 60 }),
        buildSnapshot('2026-07-01', { dailyActiveUsers: 50 }),
      ]);

      const result = await service.getMonthlyActiveUsers(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].month).toBe('2026-06');
      expect(result.data[0].peakDau).toBe(60);
    });
  });

  // ── getEngagementTrend ────────────────────────────────────────────────────

  describe('getEngagementTrend', () => {
    it('includes memorizations, reviews, and AI requests per day', async () => {
      repo.findRange.mockResolvedValue([buildSnapshot('2026-07-01')]);

      const result = await service.getEngagementTrend(30);

      expect(result.data[0]).toMatchObject({
        memorizations: 20,
        reviews: 15,
        aiRequests: 8,
      });
    });
  });

  // ── getRetentionProxy ─────────────────────────────────────────────────────

  describe('getRetentionProxy', () => {
    it('returns null when fewer than 2 snapshots', async () => {
      repo.findRange.mockResolvedValue([buildSnapshot('2026-07-01')]);

      const result = await service.getRetentionProxy(30);
      expect(result.retentionRate).toBeNull();
    });

    it('calculates retentionRate as avgDAU / totalUsers', async () => {
      repo.findRange.mockResolvedValue([
        buildSnapshot('2026-07-01', { dailyActiveUsers: 40, totalUsers: 100 }),
        buildSnapshot('2026-07-02', { dailyActiveUsers: 60, totalUsers: 100 }),
      ]);

      const result = await service.getRetentionProxy(30);
      expect(result.retentionRate).toBe(50);
    });
  });

  // ── getPlatformGrowth ─────────────────────────────────────────────────────

  describe('getPlatformGrowth', () => {
    it('includes tenant growth fields', async () => {
      repo.findRange.mockResolvedValue([
        buildSnapshot('2026-07-01', { totalTenants: 5, newTenantsToday: 1 }),
      ]);

      const result = await service.getPlatformGrowth(7);
      expect(result.data[0]).toMatchObject({ totalTenants: 5, newTenants: 1 });
    });
  });

  // ── getDonationTrend ──────────────────────────────────────────────────────

  describe('getDonationTrend', () => {
    it('includes cumulative donation amounts', async () => {
      repo.findRange.mockResolvedValue([buildSnapshot('2026-07-01', { cumulativeDonationAmount: 12000 })]);

      const result = await service.getDonationTrend(30);

      expect(result.data[0].cumulative).toBe(12000);
    });
  });

  // ── getPlatformUsageTrend ─────────────────────────────────────────────────

  describe('getPlatformUsageTrend', () => {
    it('includes ai requests in platform usage', async () => {
      repo.findRange.mockResolvedValue([buildSnapshot('2026-07-01', { dailyAiRequests: 25 })]);

      const result = await service.getPlatformUsageTrend(30);
      expect(result.data[0].aiRequests).toBe(25);
    });
  });
});
