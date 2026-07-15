import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  RewardRuleActionType,
  RewardRuleConditionType,
  PointActivityType,
} from '@shared/enums/gamification.enum';
import {
  REWARD_RULE_REPOSITORY,
  IRewardRuleRepository,
  CreateRewardRuleData,
} from '../../domain/repositories/reward-rule.repository.interface';
import {
  STUDENT_BADGE_REPOSITORY,
  IStudentBadgeRepository,
} from '../../domain/repositories/student-badge.repository.interface';
import { BadgeEngineService } from './badge-engine.service';
import { AchievementEngineService } from './achievement-engine.service';
import { PointsEngineService } from './points-engine.service';

export interface RuleEvaluationContext {
  totalPoints: number;
  memorizationPoints: number;
  revisionPoints: number;
  attendanceDays: number;
  currentDailyStreak: number;
  achievementCount: number;
  badgeCount: number;
}

@Injectable()
export class RewardRulesEngineService {
  private readonly logger = new Logger(RewardRulesEngineService.name);

  constructor(
    @Inject(REWARD_RULE_REPOSITORY)
    private readonly ruleRepo: IRewardRuleRepository,
    @Inject(STUDENT_BADGE_REPOSITORY)
    private readonly studentBadgeRepo: IStudentBadgeRepository,
    private readonly badgeEngine: BadgeEngineService,
    private readonly achievementEngine: AchievementEngineService,
    private readonly pointsEngine: PointsEngineService,
  ) {}

  /** Evaluate all active rules for a student. Call after each points event. */
  async evaluate(tenantId: string, studentId: string, ctx: RuleEvaluationContext): Promise<void> {
    const rules = await this.ruleRepo.findAll(tenantId, true);
    const now = new Date().toISOString().split('T')[0];

    for (const rule of rules) {
      const conditionMet = this.checkCondition(rule.conditionType, rule.conditionValue, ctx);
      if (!conditionMet) continue;

      if (rule.oncePerStudent) {
        // Check if already fired: for badge rules, check if badge already awarded
        if (rule.actionType === RewardRuleActionType.AWARD_BADGE) {
          const already = await this.studentBadgeRepo.hasBadge(tenantId, studentId, rule.actionValue);
          if (already) continue;
        }
      }

      await this.executeAction(tenantId, studentId, rule.actionType as RewardRuleActionType, rule.actionValue, (rule._id as object).toString(), now);
      this.logger.log(`Reward rule '${rule.name}' fired for student ${studentId}`);
    }
  }

  private checkCondition(type: RewardRuleConditionType, threshold: number, ctx: RuleEvaluationContext): boolean {
    switch (type) {
      case RewardRuleConditionType.TOTAL_POINTS:             return ctx.totalPoints >= threshold;
      case RewardRuleConditionType.MEMORIZATION_POINTS:      return ctx.memorizationPoints >= threshold;
      case RewardRuleConditionType.REVISION_POINTS:          return ctx.revisionPoints >= threshold;
      case RewardRuleConditionType.ATTENDANCE_DAYS:          return ctx.attendanceDays >= threshold;
      case RewardRuleConditionType.STREAK_DAYS:              return ctx.currentDailyStreak >= threshold;
      case RewardRuleConditionType.ACHIEVEMENT_COUNT:        return ctx.achievementCount >= threshold;
      case RewardRuleConditionType.BADGE_COUNT:              return ctx.badgeCount >= threshold;
      default:                                               return false;
    }
  }

  private async executeAction(
    tenantId: string,
    studentId: string,
    actionType: RewardRuleActionType,
    actionValue: string,
    ruleId: string,
    now: string,
  ): Promise<void> {
    switch (actionType) {
      case RewardRuleActionType.AWARD_BADGE:
        await this.badgeEngine.awardBadge(tenantId, studentId, actionValue, 'rule', { triggeredByRuleId: ruleId });
        break;
      case RewardRuleActionType.AWARD_ACHIEVEMENT:
        // Manual award flow — rule acts as admin
        try {
          await this.achievementEngine.manualAward(tenantId, studentId, actionValue, 'system-rule');
        } catch {
          this.logger.warn(`Rule ${ruleId}: achievement award failed for ${studentId}`);
        }
        break;
      case RewardRuleActionType.AWARD_POINTS: {
        const pts = parseInt(actionValue, 10);
        if (!isNaN(pts) && pts > 0) {
          await this.pointsEngine.awardBonusPoints(tenantId, studentId, pts, `rule:${ruleId}`, now);
        }
        break;
      }
    }
  }

  async listRules(tenantId: string) {
    return this.ruleRepo.findAll(tenantId);
  }

  async createRule(tenantId: string, data: CreateRewardRuleData) {
    return this.ruleRepo.create(data);
  }

  async updateRule(tenantId: string, id: string, data: Partial<{ name: string; conditionValue: number; isActive: boolean; actionValue: string }>) {
    return this.ruleRepo.update(tenantId, id, data as never);
  }

  async deleteRule(tenantId: string, id: string) {
    return this.ruleRepo.delete(tenantId, id);
  }
}
