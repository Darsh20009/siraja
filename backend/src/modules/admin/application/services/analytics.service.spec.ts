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
  newUsersToday: 5,
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
    repo = module.get(OPERATIONAL_SNAPSHOT_REPOSITORY);
  });

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
      // avg = (40+60)/2 = 50; rate = 50/100 = 50%
      expect(result.retentionRate).toBe(50);
    });
  });

  describe('getDonationTrend', () => {
    it('includes cumulative donation amounts', async () => {
      repo.findRange.mockResolvedValue([buildSnapshot('2026-07-01', { cumulativeDonationAmount: 12000 })]);

      const result = await service.getDonationTrend(30);

      expect(result.data[0].cumulative).toBe(12000);
    });
  });
});
