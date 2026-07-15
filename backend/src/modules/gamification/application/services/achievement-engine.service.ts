import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AchievementType } from '@shared/enums/gamification.enum';
import { EventDispatcherService } from '@shared/events/event-dispatcher.service';
import { AchievementUnlockedEvent } from '@shared/events/domain.events';
import {
  ACHIEVEMENT_DEFINITION_REPOSITORY,
  IAchievementDefinitionRepository,
} from '../../domain/repositories/achievement-definition.repository.interface';
import {
  STUDENT_ACHIEVEMENT_REPOSITORY,
  IStudentAchievementRepository,
} from '../../domain/repositories/student-achievement.repository.interface';
import { PointsEngineService } from './points-engine.service';
import { StudentPointsDocument } from '@database/mongoose/schemas';

export interface AchievementCheckContext {
  studentPoints: StudentPointsDocument | null;
  currentDailyStreak: number;
  currentMonthlyStreak: number;
  memorizationTransactionCount: number;
  revisionTransactionCount: number;
  attendanceDaysThisYear: number;
}

/** Default achievement seed data. */
export const DEFAULT_ACHIEVEMENTS: Array<{
  type: AchievementType;
  name: string;
  description: string;
  bonusPoints: number;
  sortOrder: number;
}> = [
  { type: AchievementType.FIRST_MEMORIZATION, name: 'أول حفظ', description: 'أتمّ أول وحدة حفظ', bonusPoints: 100, sortOrder: 1 },
  { type: AchievementType.FIRST_KHATMAH, name: 'أول ختمة', description: 'أتمّ حفظ القرآن الكريم كاملاً', bonusPoints: 2000, sortOrder: 2 },
  { type: AchievementType.STREAK_7_DAYS, name: 'سلسلة 7 أيام', description: 'حافظ على الحضور 7 أيام متتالية', bonusPoints: 150, sortOrder: 3 },
  { type: AchievementType.STREAK_30_DAYS, name: 'سلسلة 30 يوم', description: 'حافظ على الحضور 30 يوماً متتالياً', bonusPoints: 500, sortOrder: 4 },
  { type: AchievementType.STREAK_100_DAYS, name: 'سلسلة 100 يوم', description: 'حافظ على الحضور 100 يوم متتالٍ', bonusPoints: 2000, sortOrder: 5 },
  { type: AchievementType.PERFECT_ATTENDANCE, name: 'حضور مثالي', description: 'لم يغب طوال الفصل الدراسي', bonusPoints: 800, sortOrder: 6 },
  { type: AchievementType.REVISION_CHAMPION, name: 'بطل المراجعة', description: 'أكمل 100 مراجعة', bonusPoints: 600, sortOrder: 7 },
  { type: AchievementType.MEMORIZATION_CHAMPION, name: 'بطل الحفظ', description: 'أكمل 50 وحدة حفظ', bonusPoints: 1000, sortOrder: 8 },
  { type: AchievementType.TEACHER_CHOICE_AWARD, name: 'اختيار الشيخ', description: 'جائزة الشيخ التقديرية', bonusPoints: 300, sortOrder: 9 },
];

@Injectable()
export class AchievementEngineService {
  private readonly logger = new Logger(AchievementEngineService.name);

  constructor(
    @Inject(ACHIEVEMENT_DEFINITION_REPOSITORY)
    private readonly achievementDefRepo: IAchievementDefinitionRepository,
    @Inject(STUDENT_ACHIEVEMENT_REPOSITORY)
    private readonly studentAchievementRepo: IStudentAchievementRepository,
    private readonly pointsEngine: PointsEngineService,
    private readonly events: EventDispatcherService,
  ) {}

  /** Check all automatic achievements and award any newly qualified ones. */
  async checkAndAward(tenantId: string, studentId: string, ctx: AchievementCheckContext): Promise<void> {
    const definitions = await this.achievementDefRepo.findAll(tenantId, true);
    const now = new Date().toISOString().split('T')[0];

    for (const def of definitions.filter(d => d.isAutomatic)) {
      const alreadyEarned = await this.studentAchievementRepo.hasAchievement(
        tenantId,
        studentId,
        (def._id as object).toString(),
      );
      if (alreadyEarned && !def.isRepeatable) continue;

      const qualified = this.evaluateCondition(def.type as AchievementType, ctx);
      if (!qualified) continue;

      await this.studentAchievementRepo.create({
        tenantId,
        studentId,
        achievementId: (def._id as object).toString(),
        awardedAt: now,
        awardedBy: 'automatic',
      });

      if (def.bonusPoints > 0) {
        await this.pointsEngine.awardBonusPoints(tenantId, studentId, def.bonusPoints, `achievement:${def.type}`, now);
      }

      this.events.achievementUnlocked(new AchievementUnlockedEvent(
        studentId, tenantId, def.type, def.name,
      ));

      this.logger.log(`Achievement unlocked [${def.type}] for student ${studentId}`);
    }
  }

  private evaluateCondition(type: AchievementType, ctx: AchievementCheckContext): boolean {
    const totalPoints = ctx.studentPoints?.totalPoints ?? 0;
    switch (type) {
      case AchievementType.FIRST_MEMORIZATION:
        return ctx.memorizationTransactionCount >= 1;
      case AchievementType.FIRST_KHATMAH:
        return totalPoints >= 10000; // proxy — Phase 13 will check actual khatmah completion
      case AchievementType.STREAK_7_DAYS:
        return ctx.currentDailyStreak >= 7;
      case AchievementType.STREAK_30_DAYS:
        return ctx.currentDailyStreak >= 30;
      case AchievementType.STREAK_100_DAYS:
        return ctx.currentDailyStreak >= 100;
      case AchievementType.PERFECT_ATTENDANCE:
        return ctx.attendanceDaysThisYear >= 30; // at least 30 distinct active days this year
      case AchievementType.REVISION_CHAMPION:
        return ctx.revisionTransactionCount >= 100;
      case AchievementType.MEMORIZATION_CHAMPION:
        return ctx.memorizationTransactionCount >= 50;
      case AchievementType.TEACHER_CHOICE_AWARD:
        return false; // manual only
      default:
        return false;
    }
  }

  /** Manually award an achievement (sheikh/admin action). */
  async manualAward(
    tenantId: string,
    studentId: string,
    achievementType: string,
    awardedByUserId: string,
    note?: string,
  ): Promise<void> {
    const def = await this.achievementDefRepo.findByType(tenantId, achievementType);
    if (!def) throw new NotFoundException(`Achievement type '${achievementType}' not found in tenant ${tenantId}`);

    const now = new Date().toISOString().split('T')[0];
    await this.studentAchievementRepo.create({
      tenantId,
      studentId,
      achievementId: (def._id as object).toString(),
      awardedAt: now,
      awardedBy: 'manual',
      awardedByUserId,
      note,
    });

    if (def.bonusPoints > 0) {
      await this.pointsEngine.awardBonusPoints(tenantId, studentId, def.bonusPoints, `achievement:${def.type}`, now);
    }

    this.events.achievementUnlocked(new AchievementUnlockedEvent(
      studentId, tenantId, def.type, def.name,
    ));
  }

  async getStudentAchievements(tenantId: string, studentId: string) {
    return this.studentAchievementRepo.findByStudent(tenantId, studentId);
  }

  async seedDefaultAchievements(tenantId: string): Promise<void> {
    return this.achievementDefRepo.seedDefaults(tenantId);
  }

  async listDefinitions(tenantId: string) {
    return this.achievementDefRepo.findAll(tenantId);
  }
}
