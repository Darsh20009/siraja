import { Test, TestingModule } from '@nestjs/testing';
import { AchievementEngineService } from './achievement-engine.service';
import { ACHIEVEMENT_DEFINITION_REPOSITORY } from '../../domain/repositories/achievement-definition.repository.interface';
import { STUDENT_ACHIEVEMENT_REPOSITORY } from '../../domain/repositories/student-achievement.repository.interface';
import { EventDispatcherService } from '@shared/events/event-dispatcher.service';
import { PointsEngineService } from './points-engine.service';
import { AchievementType } from '@shared/enums/gamification.enum';

const makeDef = (type: AchievementType, overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => `def-${type}` },
  type,
  name: `Achievement ${type}`,
  isAutomatic: true,
  isRepeatable: false,
  bonusPoints: 100,
  ...overrides,
});

const mockDefRepo = { findAll: jest.fn(), findById: jest.fn(), findByType: jest.fn(), create: jest.fn(), update: jest.fn(), seedDefaults: jest.fn() };
const mockStudentAchRepo = { findByStudent: jest.fn(), hasAchievement: jest.fn(), create: jest.fn(), countByStudent: jest.fn() };
const mockPointsEngine = { awardBonusPoints: jest.fn() };
const mockEvents = { pointsAwarded: jest.fn(), achievementUnlocked: jest.fn(), badgeAwarded: jest.fn() };

describe('AchievementEngineService', () => {
  let service: AchievementEngineService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementEngineService,
        { provide: ACHIEVEMENT_DEFINITION_REPOSITORY, useValue: mockDefRepo },
        { provide: STUDENT_ACHIEVEMENT_REPOSITORY, useValue: mockStudentAchRepo },
        { provide: PointsEngineService, useValue: mockPointsEngine },
        { provide: EventDispatcherService, useValue: mockEvents },
      ],
    }).compile();
    service = module.get(AchievementEngineService);
  });

  it('awards FIRST_MEMORIZATION when memorizationCount >= 1', async () => {
    mockDefRepo.findAll.mockResolvedValue([makeDef(AchievementType.FIRST_MEMORIZATION)]);
    mockStudentAchRepo.hasAchievement.mockResolvedValue(false);
    mockStudentAchRepo.create.mockResolvedValue({});
    mockPointsEngine.awardBonusPoints.mockResolvedValue(undefined);

    await service.checkAndAward('t1', 's1', {
      studentPoints: { totalPoints: 0 } as never,
      currentDailyStreak: 0,
      currentMonthlyStreak: 0,
      memorizationTransactionCount: 1,
      revisionTransactionCount: 0,
      attendanceDaysThisYear: 0,
    });

    expect(mockStudentAchRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      achievementId: 'def-first_memorization',
      awardedBy: 'automatic',
    }));
    expect(mockEvents.achievementUnlocked).toHaveBeenCalledWith(expect.any(Object));
  });

  it('skips already-earned non-repeatable achievements', async () => {
    mockDefRepo.findAll.mockResolvedValue([makeDef(AchievementType.STREAK_7_DAYS)]);
    mockStudentAchRepo.hasAchievement.mockResolvedValue(true); // already earned

    await service.checkAndAward('t1', 's1', {
      studentPoints: null,
      currentDailyStreak: 10,
      currentMonthlyStreak: 0,
      memorizationTransactionCount: 0,
      revisionTransactionCount: 0,
      attendanceDaysThisYear: 0,
    });

    expect(mockStudentAchRepo.create).not.toHaveBeenCalled();
  });

  it('does not award TEACHER_CHOICE_AWARD automatically', async () => {
    mockDefRepo.findAll.mockResolvedValue([makeDef(AchievementType.TEACHER_CHOICE_AWARD)]);
    mockStudentAchRepo.hasAchievement.mockResolvedValue(false);

    await service.checkAndAward('t1', 's1', {
      studentPoints: { totalPoints: 99999 } as never,
      currentDailyStreak: 999,
      currentMonthlyStreak: 999,
      memorizationTransactionCount: 999,
      revisionTransactionCount: 999,
      attendanceDaysThisYear: 999,
    });

    expect(mockStudentAchRepo.create).not.toHaveBeenCalled();
  });

  it('manualAward creates achievement record', async () => {
    mockDefRepo.findByType.mockResolvedValue(makeDef(AchievementType.TEACHER_CHOICE_AWARD));
    mockStudentAchRepo.create.mockResolvedValue({});
    mockPointsEngine.awardBonusPoints.mockResolvedValue(undefined);

    await service.manualAward('t1', 's1', AchievementType.TEACHER_CHOICE_AWARD, 'sheikh-1', 'Well done');

    expect(mockStudentAchRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      awardedBy: 'manual',
      awardedByUserId: 'sheikh-1',
      note: 'Well done',
    }));
  });

  it('manualAward throws NotFoundException when type not found', async () => {
    mockDefRepo.findByType.mockResolvedValue(null);
    await expect(service.manualAward('t1', 's1', 'unknown', 'u1')).rejects.toThrow('not found');
  });
});
