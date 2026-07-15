import { Test, TestingModule } from '@nestjs/testing';
import { PointsEngineService } from './points-engine.service';
import { GAMIFICATION_CONFIG_REPOSITORY } from '../../domain/repositories/gamification-config.repository.interface';
import { POINT_TRANSACTION_REPOSITORY } from '../../domain/repositories/point-transaction.repository.interface';
import { STUDENT_POINTS_REPOSITORY } from '../../domain/repositories/student-points.repository.interface';
import { EventDispatcherService } from '@shared/events/event-dispatcher.service';
import { PointActivityType } from '@shared/enums/gamification.enum';

const mockConfigRepo = { getPointValue: jest.fn(), findByTenantId: jest.fn(), upsert: jest.fn() };
const mockTxRepo = { create: jest.fn(), findByStudent: jest.fn(), breakdownByActivity: jest.fn() };
const mockPointsRepo = {
  addPoints: jest.fn(),
  findByStudent: jest.fn(),
  findTopByTotal: jest.fn(),
  findTopByWeekly: jest.fn(),
  findTopByMonthly: jest.fn(),
};
const mockEvents = { pointsAwarded: jest.fn(), achievementUnlocked: jest.fn(), badgeAwarded: jest.fn() };

describe('PointsEngineService', () => {
  let service: PointsEngineService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsEngineService,
        { provide: GAMIFICATION_CONFIG_REPOSITORY, useValue: mockConfigRepo },
        { provide: POINT_TRANSACTION_REPOSITORY, useValue: mockTxRepo },
        { provide: STUDENT_POINTS_REPOSITORY, useValue: mockPointsRepo },
        { provide: EventDispatcherService, useValue: mockEvents },
      ],
    }).compile();
    service = module.get(PointsEngineService);
  });

  it('awards correct points from config', async () => {
    mockConfigRepo.getPointValue.mockResolvedValue(100);
    mockTxRepo.create.mockResolvedValue({});
    mockPointsRepo.addPoints.mockResolvedValue({ totalPoints: 100 });

    const result = await service.awardPoints('t1', 's1', PointActivityType.MEMORIZATION_COMPLETION);

    expect(result.points).toBe(100);
    expect(result.totalPoints).toBe(100);
    expect(mockTxRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 't1', studentId: 's1', activityType: PointActivityType.MEMORIZATION_COMPLETION, points: 100,
    }));
    expect(mockEvents.pointsAwarded).toHaveBeenCalledWith(expect.any(Object));
  });

  it('respects pointOverride', async () => {
    mockTxRepo.create.mockResolvedValue({});
    mockPointsRepo.addPoints.mockResolvedValue({ totalPoints: 999 });

    const result = await service.awardPoints('t1', 's1', PointActivityType.ATTENDANCE, { pointOverride: 999 });

    expect(mockConfigRepo.getPointValue).not.toHaveBeenCalled();
    expect(result.points).toBe(999);
  });

  it('skips award when points = 0', async () => {
    mockConfigRepo.getPointValue.mockResolvedValue(0);

    const result = await service.awardPoints('t1', 's1', PointActivityType.COMMUNITY_PARTICIPATION);

    expect(result.points).toBe(0);
    expect(mockTxRepo.create).not.toHaveBeenCalled();
  });

  it('awards bonus points without calling configRepo', async () => {
    mockTxRepo.create.mockResolvedValue({});
    mockPointsRepo.addPoints.mockResolvedValue({ totalPoints: 50 });

    await service.awardBonusPoints('t1', 's1', 50, 'achievement bonus', '2026-07-14');

    expect(mockConfigRepo.getPointValue).not.toHaveBeenCalled();
    expect(mockTxRepo.create).toHaveBeenCalled();
  });

  it('skips bonus points when amount <= 0', async () => {
    await service.awardBonusPoints('t1', 's1', 0, 'nothing', '2026-07-14');
    expect(mockTxRepo.create).not.toHaveBeenCalled();
  });

  it('getStudentPoints delegates to repo', async () => {
    mockPointsRepo.findByStudent.mockResolvedValue({ totalPoints: 500 });
    const result = await service.getStudentPoints('t1', 's1');
    expect(result).toEqual({ totalPoints: 500 });
  });

  it('getConfig delegates to configRepo', async () => {
    mockConfigRepo.findByTenantId.mockResolvedValue({ gamificationEnabled: true });
    const result = await service.getConfig('t1');
    expect(result).toEqual({ gamificationEnabled: true });
  });
});
