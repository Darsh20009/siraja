import { Inject, Injectable, Logger } from '@nestjs/common';
import { LeaderboardEntityType, LeaderboardPeriod } from '@shared/enums/gamification.enum';
import {
  LEADERBOARD_ENTRY_REPOSITORY,
  ILeaderboardEntryRepository,
  UpsertLeaderboardEntryData,
} from '../../domain/repositories/leaderboard-entry.repository.interface';
import { STUDENT_POINTS_REPOSITORY, IStudentPointsRepository } from '../../domain/repositories/student-points.repository.interface';
import { STUDENT_ACHIEVEMENT_REPOSITORY, IStudentAchievementRepository } from '../../domain/repositories/student-achievement.repository.interface';
import { STUDENT_BADGE_REPOSITORY, IStudentBadgeRepository } from '../../domain/repositories/student-badge.repository.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Student } from '@database/mongoose/schemas';
import { Model } from 'mongoose';

function currentPeriodKey(period: LeaderboardPeriod): string {
  const now = new Date();
  switch (period) {
    case LeaderboardPeriod.DAILY:
      return now.toISOString().split('T')[0];
    case LeaderboardPeriod.WEEKLY: {
      const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    }
    case LeaderboardPeriod.MONTHLY:
      return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    case LeaderboardPeriod.YEARLY:
      return `${now.getUTCFullYear()}`;
    case LeaderboardPeriod.ALL_TIME:
      return 'all';
  }
}

function pointsField(period: LeaderboardPeriod): 'dailyPoints' | 'weeklyPoints' | 'monthlyPoints' | 'yearlyPoints' | 'totalPoints' {
  switch (period) {
    case LeaderboardPeriod.DAILY:   return 'dailyPoints';
    case LeaderboardPeriod.WEEKLY:  return 'weeklyPoints';
    case LeaderboardPeriod.MONTHLY: return 'monthlyPoints';
    case LeaderboardPeriod.YEARLY:  return 'yearlyPoints';
    default:                        return 'totalPoints';
  }
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @Inject(LEADERBOARD_ENTRY_REPOSITORY)
    private readonly leaderboardRepo: ILeaderboardEntryRepository,
    @Inject(STUDENT_POINTS_REPOSITORY)
    private readonly studentPointsRepo: IStudentPointsRepository,
    @Inject(STUDENT_ACHIEVEMENT_REPOSITORY)
    private readonly achievementRepo: IStudentAchievementRepository,
    @Inject(STUDENT_BADGE_REPOSITORY)
    private readonly badgeRepo: IStudentBadgeRepository,
    @InjectModel(Student.name)
    private readonly studentModel: Model<Student>,
  ) {}

  /** Refresh student leaderboard for a given period. */
  async refreshStudentLeaderboard(tenantId: string, period: LeaderboardPeriod, limit = 100): Promise<void> {
    const periodKey = currentPeriodKey(period);
    const field = pointsField(period);
    const topPoints = await this.studentPointsRepo[field === 'dailyPoints' ? 'findTopByTotal' : field === 'weeklyPoints' ? 'findTopByWeekly' : 'findTopByMonthly'](tenantId, limit);

    const computedAt = new Date().toISOString();
    const entries: UpsertLeaderboardEntryData[] = [];

    for (let i = 0; i < topPoints.length; i++) {
      const sp = topPoints[i];
      const studentId = sp.studentId.toString();

      // Fetch display name
      const student = await this.studentModel.findById(studentId).select('userId').lean();
      const entityName = studentId; // Phase 13 will populate name from User

      const [achievementCount, badgeCount] = await Promise.all([
        this.achievementRepo.countByStudent(tenantId, studentId),
        this.badgeRepo.countByStudent(tenantId, studentId),
      ]);

      entries.push({
        tenantId,
        entityId: studentId,
        entityType: LeaderboardEntityType.STUDENT,
        entityName,
        period,
        periodKey,
        points: sp[field] ?? sp.totalPoints,
        rank: i + 1,
        achievementCount,
        badgeCount,
        computedAt,
      });
    }

    await this.leaderboardRepo.bulkUpsert(entries);
    this.logger.log(`Leaderboard refreshed: tenant=${tenantId} period=${period} entries=${entries.length}`);
  }

  async getLeaderboard(
    tenantId: string,
    entityType: LeaderboardEntityType,
    period: LeaderboardPeriod,
    periodKey?: string,
    limit = 50,
  ) {
    const key = periodKey ?? currentPeriodKey(period);
    return this.leaderboardRepo.findLeaderboard(tenantId, entityType, period, key, limit);
  }

  async getStudentRanking(tenantId: string, studentId: string) {
    return this.leaderboardRepo.findEntityRanking(tenantId, studentId, LeaderboardEntityType.STUDENT);
  }

  currentPeriodKey(period: LeaderboardPeriod): string {
    return currentPeriodKey(period);
  }
}
