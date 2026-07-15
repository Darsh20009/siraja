import { Inject, Injectable } from '@nestjs/common';
import { LeaderboardEntityType, LeaderboardPeriod } from '@shared/enums/gamification.enum';
import { STUDENT_POINTS_REPOSITORY, IStudentPointsRepository } from '../../domain/repositories/student-points.repository.interface';
import { STREAK_REPOSITORY, IStreakRepository } from '../../domain/repositories/streak.repository.interface';
import { STUDENT_ACHIEVEMENT_REPOSITORY, IStudentAchievementRepository } from '../../domain/repositories/student-achievement.repository.interface';
import { STUDENT_BADGE_REPOSITORY, IStudentBadgeRepository } from '../../domain/repositories/student-badge.repository.interface';
import { LEADERBOARD_ENTRY_REPOSITORY, ILeaderboardEntryRepository } from '../../domain/repositories/leaderboard-entry.repository.interface';
import { POINT_TRANSACTION_REPOSITORY, IPointTransactionRepository } from '../../domain/repositories/point-transaction.repository.interface';

export interface StudentGamificationStats {
  studentId: string;
  tenantId: string;
  points: {
    total: number;
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
    breakdown: Record<string, number>;
  };
  streaks: {
    daily: number;
    longestDaily: number;
    weekly: number;
    longestWeekly: number;
    monthly: number;
    longestMonthly: number;
  };
  achievementCount: number;
  badgeCount: number;
  rankings: Array<{ period: string; periodKey: string; rank: number; points: number }>;
  recentTransactions: Array<{ activityType: string; points: number; activityDate: string }>;
}

@Injectable()
export class GamificationStatsService {
  constructor(
    @Inject(STUDENT_POINTS_REPOSITORY)
    private readonly studentPointsRepo: IStudentPointsRepository,
    @Inject(STREAK_REPOSITORY)
    private readonly streakRepo: IStreakRepository,
    @Inject(STUDENT_ACHIEVEMENT_REPOSITORY)
    private readonly achievementRepo: IStudentAchievementRepository,
    @Inject(STUDENT_BADGE_REPOSITORY)
    private readonly badgeRepo: IStudentBadgeRepository,
    @Inject(LEADERBOARD_ENTRY_REPOSITORY)
    private readonly leaderboardRepo: ILeaderboardEntryRepository,
    @Inject(POINT_TRANSACTION_REPOSITORY)
    private readonly transactionRepo: IPointTransactionRepository,
  ) {}

  async getStudentStats(tenantId: string, studentId: string): Promise<StudentGamificationStats> {
    const [studentPoints, streak, achievementCount, badgeCount, rankings, breakdown, recentTx] = await Promise.all([
      this.studentPointsRepo.findByStudent(tenantId, studentId),
      this.streakRepo.findByStudent(tenantId, studentId),
      this.achievementRepo.countByStudent(tenantId, studentId),
      this.badgeRepo.countByStudent(tenantId, studentId),
      this.leaderboardRepo.findEntityRanking(tenantId, studentId, LeaderboardEntityType.STUDENT),
      this.transactionRepo.breakdownByActivity(tenantId, studentId),
      this.transactionRepo.findByStudent(tenantId, studentId, 10),
    ]);

    return {
      studentId,
      tenantId,
      points: {
        total: studentPoints?.totalPoints ?? 0,
        daily: studentPoints?.dailyPoints ?? 0,
        weekly: studentPoints?.weeklyPoints ?? 0,
        monthly: studentPoints?.monthlyPoints ?? 0,
        yearly: studentPoints?.yearlyPoints ?? 0,
        breakdown: breakdown.reduce<Record<string, number>>(
          (acc, item) => { acc[item.activityType] = item.total; return acc; },
          {},
        ),
      },
      streaks: {
        daily: streak?.currentDailyStreak ?? 0,
        longestDaily: streak?.longestDailyStreak ?? 0,
        weekly: streak?.currentWeeklyStreak ?? 0,
        longestWeekly: streak?.longestWeeklyStreak ?? 0,
        monthly: streak?.currentMonthlyStreak ?? 0,
        longestMonthly: streak?.longestMonthlyStreak ?? 0,
      },
      achievementCount,
      badgeCount,
      rankings: rankings.map(r => ({
        period: r.period,
        periodKey: r.periodKey,
        rank: r.rank,
        points: r.points,
      })),
      recentTransactions: recentTx.map(t => ({
        activityType: t.activityType,
        points: t.points,
        activityDate: t.activityDate,
      })),
    };
  }
}
