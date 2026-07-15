import { Test, TestingModule } from '@nestjs/testing';
import { RewardRulesEngineService } from './reward-rules-engine.service';
import { REWARD_RULE_REPOSITORY } from '../../domain/repositories/reward-rule.repository.interface';
import { STUDENT_BADGE_REPOSITORY } from '../../domain/repositories/student-badge.repository.interface';
import { BadgeEngineService } from './badge-engine.service';
import { AchievementEngineService } from './achievement-engine.service';
import { PointsEngineService } from './points-engine.service';
import { RewardRuleActionType, RewardRuleConditionType } from '@shared/enums/gamification.enum';

const makeRule = (condition: RewardRuleConditionType, threshold: number, action: RewardRuleActionType, value: string) => ({
  _id: { toString: () => 'rule-1' },
  name: 'Test Rule',
  conditionType: condition,
  conditionValue: threshold,
  actionType: action,
  actionValue: value,
  oncePerStudent: true,
  isActive: true,
});

const mockRuleRepo = { findAll: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
const mockBadgeRepo = { hasBadge: jest.fn(), findByStudent: jest.fn(), create: jest.fn(), countByStudent: jest.fn() };
const mockBadgeEngine = { awardBadge: jest.fn() };
const mockAchievementEngine = { manualAward: jest.fn() };
const mockPointsEngine = { awardBonusPoints: jest.fn() };

describe('RewardRulesEngineService', () => {
  let service: RewardRulesEngineService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardRulesEngineService,
        { provide: REWARD_RULE_REPOSITORY, useValue: mockRuleRepo },
        { provide: STUDENT_BADGE_REPOSITORY, useValue: mockBadgeRepo },
        { provide: BadgeEngineService, useValue: mockBadgeEngine },
        { provide: AchievementEngineService, useValue: mockAchievementEngine },
        { provide: PointsEngineService, useValue: mockPointsEngine },
      ],
    }).compile();
    service = module.get(RewardRulesEngineService);
  });

  it('fires badge rule when total points threshold met', async () => {
    mockRuleRepo.findAll.mockResolvedValue([makeRule(
      RewardRuleConditionType.TOTAL_POINTS, 1000,
      RewardRuleActionType.AWARD_BADGE, 'badge-abc',
    )]);
    mockBadgeRepo.hasBadge.mockResolvedValue(false);

    await service.evaluate('t1', 's1', {
      totalPoints: 1001, memorizationPoints: 0, revisionPoints: 0,
      attendanceDays: 0, currentDailyStreak: 0, achievementCount: 0, badgeCount: 0,
    });

    expect(mockBadgeEngine.awardBadge).toHaveBeenCalledWith('t1', 's1', 'badge-abc', 'rule', expect.any(Object));
  });

  it('skips rule when condition not met', async () => {
    mockRuleRepo.findAll.mockResolvedValue([makeRule(
      RewardRuleConditionType.TOTAL_POINTS, 1000,
      RewardRuleActionType.AWARD_BADGE, 'badge-abc',
    )]);

    await service.evaluate('t1', 's1', {
      totalPoints: 500, memorizationPoints: 0, revisionPoints: 0,
      attendanceDays: 0, currentDailyStreak: 0, achievementCount: 0, badgeCount: 0,
    });

    expect(mockBadgeEngine.awardBadge).not.toHaveBeenCalled();
  });

  it('skips badge rule when oncePerStudent=true and badge already awarded', async () => {
    mockRuleRepo.findAll.mockResolvedValue([makeRule(
      RewardRuleConditionType.STREAK_DAYS, 30,
      RewardRuleActionType.AWARD_BADGE, 'badge-xyz',
    )]);
    mockBadgeRepo.hasBadge.mockResolvedValue(true);

    await service.evaluate('t1', 's1', {
      totalPoints: 0, memorizationPoints: 0, revisionPoints: 0,
      attendanceDays: 0, currentDailyStreak: 30, achievementCount: 0, badgeCount: 0,
    });

    expect(mockBadgeEngine.awardBadge).not.toHaveBeenCalled();
  });

  it('fires points rule and calls awardBonusPoints', async () => {
    mockRuleRepo.findAll.mockResolvedValue([makeRule(
      RewardRuleConditionType.ATTENDANCE_DAYS, 30,
      RewardRuleActionType.AWARD_POINTS, '500',
    )]);

    await service.evaluate('t1', 's1', {
      totalPoints: 0, memorizationPoints: 0, revisionPoints: 0,
      attendanceDays: 31, currentDailyStreak: 0, achievementCount: 0, badgeCount: 0,
    });

    expect(mockPointsEngine.awardBonusPoints).toHaveBeenCalledWith('t1', 's1', 500, expect.any(String), expect.any(String));
  });
});
