import { Test, TestingModule } from '@nestjs/testing';
import { StreakService } from './streak.service';
import { STREAK_REPOSITORY } from '../../domain/repositories/streak.repository.interface';

const makeStreakDoc = (overrides: Record<string, unknown> = {}) => ({
  currentDailyStreak: 0,
  longestDailyStreak: 0,
  lastDailyActivityDate: undefined,
  currentWeeklyStreak: 0,
  longestWeeklyStreak: 0,
  lastWeeklyActivityWeek: undefined,
  currentMonthlyStreak: 0,
  longestMonthlyStreak: 0,
  lastMonthlyActivityMonth: undefined,
  activeDatesThisYear: [],
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockStreakRepo = {
  findByStudent: jest.fn(),
  upsert: jest.fn(),
  recordActivity: jest.fn(),
};

describe('StreakService', () => {
  let service: StreakService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreakService,
        { provide: STREAK_REPOSITORY, useValue: mockStreakRepo },
      ],
    }).compile();
    service = module.get(StreakService);
  });

  it('initialises streak to 1 on first activity', async () => {
    const doc = makeStreakDoc();
    mockStreakRepo.findByStudent.mockResolvedValue(doc);

    const result = await service.recordActivity('t1', 's1', '2026-07-14');

    expect(result.currentDailyStreak).toBe(1);
    expect(result.milestonesReached).toContain('daily');
    expect(doc.save).toHaveBeenCalled();
  });

  it('increments daily streak on consecutive days', async () => {
    const doc = makeStreakDoc({ currentDailyStreak: 3, longestDailyStreak: 3, lastDailyActivityDate: '2026-07-13' });
    mockStreakRepo.findByStudent.mockResolvedValue(doc);

    const result = await service.recordActivity('t1', 's1', '2026-07-14');

    expect(result.currentDailyStreak).toBe(4);
    expect(result.dailyStreakHit).toBe(4);
  });

  it('resets daily streak on gap > 1 day', async () => {
    const doc = makeStreakDoc({ currentDailyStreak: 10, longestDailyStreak: 10, lastDailyActivityDate: '2026-07-01' });
    mockStreakRepo.findByStudent.mockResolvedValue(doc);

    const result = await service.recordActivity('t1', 's1', '2026-07-14');

    expect(result.currentDailyStreak).toBe(1); // reset
    expect(result.longestDailyStreak).toBe(10); // preserved
  });

  it('does not double-count same day', async () => {
    const doc = makeStreakDoc({ currentDailyStreak: 5, lastDailyActivityDate: '2026-07-14' });
    mockStreakRepo.findByStudent.mockResolvedValue(doc);

    const result = await service.recordActivity('t1', 's1', '2026-07-14');

    expect(result.currentDailyStreak).toBe(5); // unchanged
    expect(result.dailyStreakHit).toBe(0); // no milestone
  });

  it('adds activityDate to activeDatesThisYear', async () => {
    const doc = makeStreakDoc({ activeDatesThisYear: ['2026-07-13'] });
    mockStreakRepo.findByStudent.mockResolvedValue(doc);

    await service.recordActivity('t1', 's1', '2026-07-14');

    expect(doc.activeDatesThisYear).toContain('2026-07-14');
  });
});
