import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS } from '@shared/events/events.constants';
import {
  MemorizationRecordedEvent,
  ReviewRecordedEvent,
  AttendanceMarkedEvent,
  ExamCompletedEvent,
} from '@shared/events/domain.events';
import { PointActivityType } from '@shared/enums/gamification.enum';
import { PointsEngineService } from '../../application/services/points-engine.service';
import { StreakService } from '../../application/services/streak.service';
import { AchievementEngineService } from '../../application/services/achievement-engine.service';
import { RewardRulesEngineService } from '../../application/services/reward-rules-engine.service';
import { LeaderboardService } from '../../application/services/leaderboard.service';
import { LeaderboardPeriod } from '@shared/enums/gamification.enum';
import { Inject } from '@nestjs/common';
import { POINT_TRANSACTION_REPOSITORY, IPointTransactionRepository } from '../../domain/repositories/point-transaction.repository.interface';
import { STUDENT_ACHIEVEMENT_REPOSITORY, IStudentAchievementRepository } from '../../domain/repositories/student-achievement.repository.interface';
import { STUDENT_BADGE_REPOSITORY, IStudentBadgeRepository } from '../../domain/repositories/student-badge.repository.interface';
import { STREAK_REPOSITORY, IStreakRepository } from '../../domain/repositories/streak.repository.interface';

@Injectable()
export class GamificationEventListener {
  private readonly logger = new Logger(GamificationEventListener.name);

  constructor(
    private readonly pointsEngine: PointsEngineService,
    private readonly streakService: StreakService,
    private readonly achievementEngine: AchievementEngineService,
    private readonly rewardRulesEngine: RewardRulesEngineService,
    private readonly leaderboardService: LeaderboardService,
    @Inject(POINT_TRANSACTION_REPOSITORY)
    private readonly txRepo: IPointTransactionRepository,
    @Inject(STUDENT_ACHIEVEMENT_REPOSITORY)
    private readonly achievementRepo: IStudentAchievementRepository,
    @Inject(STUDENT_BADGE_REPOSITORY)
    private readonly badgeRepo: IStudentBadgeRepository,
    @Inject(STREAK_REPOSITORY)
    private readonly streakRepo: IStreakRepository,
  ) {}

  @OnEvent(EVENTS.MEMORIZATION_RECORDED)
  async onMemorizationRecorded(event: MemorizationRecordedEvent): Promise<void> {
    try {
      await this.processActivityEvent(
        event.tenantId,
        event.studentId,
        PointActivityType.MEMORIZATION_COMPLETION,
        event.recordId,
        'memorization_records',
      );
    } catch (err) {
      this.logger.error(`Gamification: memorization event failed for ${event.studentId}`, err);
    }
  }

  @OnEvent(EVENTS.REVIEW_RECORDED)
  async onReviewRecorded(event: ReviewRecordedEvent): Promise<void> {
    try {
      await this.processActivityEvent(
        event.tenantId,
        event.studentId,
        PointActivityType.REVISION_COMPLETION,
        event.recordId,
        'review_records',
      );
    } catch (err) {
      this.logger.error(`Gamification: review event failed for ${event.studentId}`, err);
    }
  }

  @OnEvent(EVENTS.ATTENDANCE_MARKED)
  async onAttendanceMarked(event: AttendanceMarkedEvent): Promise<void> {
    // Find students who were PRESENT (not in the absent list)
    // Phase 13 will inject CircleRepository to get full student list.
    // For now, attendance events come with absentStudentIds — we can't award
    // present students without the full list. We emit a no-op and rely on
    // explicit attendance-record events where studentId is present.
    // This is an intentional Phase 13 gap documented in the audit.
    this.logger.debug(`Attendance event received for circle ${event.circleId} (${event.absentStudentIds.length} absent)`);
  }

  @OnEvent(EVENTS.EXAM_COMPLETED)
  async onExamCompleted(event: ExamCompletedEvent): Promise<void> {
    if (!event.passed) return; // Only award for passing exams
    try {
      await this.processActivityEvent(
        event.tenantId,
        event.studentId,
        PointActivityType.EXAM_SUCCESS,
        event.examId,
        'exams',
      );
    } catch (err) {
      this.logger.error(`Gamification: exam event failed for ${event.studentId}`, err);
    }
  }

  /**
   * Core processing pipeline for a single student activity:
   * 1. Award activity points
   * 2. Update streak + award streak milestone points
   * 3. Check achievements
   * 4. Evaluate reward rules
   * 5. Refresh leaderboard snapshot
   */
  private async processActivityEvent(
    tenantId: string,
    studentId: string,
    activityType: PointActivityType,
    referenceId: string,
    referenceType: string,
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Step 1: Award activity points
    const result = await this.pointsEngine.awardPoints(tenantId, studentId, activityType, {
      referenceId,
      referenceType,
      activityDate: today,
    });

    // Step 2: Update streak + award streak milestone points
    const streakResult = await this.streakService.recordActivity(tenantId, studentId, today);

    if (streakResult.dailyStreakHit > 0) {
      await this.pointsEngine.awardPoints(tenantId, studentId, PointActivityType.DAILY_STREAK, {
        activityDate: today,
        metadata: { streak: streakResult.dailyStreakHit },
      });
    }
    if (streakResult.weeklyStreakHit > 0) {
      await this.pointsEngine.awardPoints(tenantId, studentId, PointActivityType.WEEKLY_STREAK, {
        activityDate: today,
        metadata: { streak: streakResult.weeklyStreakHit },
      });
    }
    if (streakResult.monthlyStreakHit > 0) {
      await this.pointsEngine.awardPoints(tenantId, studentId, PointActivityType.MONTHLY_STREAK, {
        activityDate: today,
        metadata: { streak: streakResult.monthlyStreakHit },
      });
    }

    // Step 3: Build context for achievement check
    const studentPoints = await this.pointsEngine.getStudentPoints(tenantId, studentId);
    const [memCount, revCount, streak] = await Promise.all([
      this.txRepo.countByStudentAndActivity(tenantId, studentId, PointActivityType.MEMORIZATION_COMPLETION),
      this.txRepo.countByStudentAndActivity(tenantId, studentId, PointActivityType.REVISION_COMPLETION),
      this.streakRepo.findByStudent(tenantId, studentId),
    ]);

    await this.achievementEngine.checkAndAward(tenantId, studentId, {
      studentPoints,
      currentDailyStreak: streakResult.currentDailyStreak,
      currentMonthlyStreak: streakResult.currentMonthlyStreak,
      memorizationTransactionCount: memCount,
      revisionTransactionCount: revCount,
      attendanceDaysThisYear: streak?.activeDatesThisYear?.length ?? 0,
    });

    // Step 4: Evaluate reward rules
    const [achievementCount, badgeCount] = await Promise.all([
      this.achievementRepo.countByStudent(tenantId, studentId),
      this.badgeRepo.countByStudent(tenantId, studentId),
    ]);

    const breakdown = await this.txRepo.breakdownByActivity(tenantId, studentId);
    const memPoints = breakdown.find(b => b.activityType === PointActivityType.MEMORIZATION_COMPLETION)?.total ?? 0;
    const revPoints = breakdown.find(b => b.activityType === PointActivityType.REVISION_COMPLETION)?.total ?? 0;
    const attDays = streak?.activeDatesThisYear?.length ?? 0;

    await this.rewardRulesEngine.evaluate(tenantId, studentId, {
      totalPoints: result.totalPoints,
      memorizationPoints: memPoints,
      revisionPoints: revPoints,
      attendanceDays: attDays,
      currentDailyStreak: streakResult.currentDailyStreak,
      achievementCount,
      badgeCount,
    });

    // Step 5: Refresh leaderboard (async — don't block)
    this.leaderboardService
      .refreshStudentLeaderboard(tenantId, LeaderboardPeriod.ALL_TIME, 100)
      .catch(err => this.logger.warn('Leaderboard refresh failed:', err));
  }
}
