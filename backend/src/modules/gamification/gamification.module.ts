import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  GamificationConfig, GamificationConfigSchema,
  PointTransaction, PointTransactionSchema,
  StudentPoints, StudentPointsSchema,
  Streak, StreakSchema,
  AchievementDefinition, AchievementDefinitionSchema,
  StudentAchievement, StudentAchievementSchema,
  BadgeDefinition, BadgeDefinitionSchema,
  StudentBadge, StudentBadgeSchema,
  LeaderboardEntry, LeaderboardEntrySchema,
  RewardRule, RewardRuleSchema,
  Student, StudentSchema,
} from '@database/mongoose/schemas';

// Repository tokens
import { GAMIFICATION_CONFIG_REPOSITORY } from './domain/repositories/gamification-config.repository.interface';
import { POINT_TRANSACTION_REPOSITORY } from './domain/repositories/point-transaction.repository.interface';
import { STUDENT_POINTS_REPOSITORY } from './domain/repositories/student-points.repository.interface';
import { STREAK_REPOSITORY } from './domain/repositories/streak.repository.interface';
import { ACHIEVEMENT_DEFINITION_REPOSITORY } from './domain/repositories/achievement-definition.repository.interface';
import { STUDENT_ACHIEVEMENT_REPOSITORY } from './domain/repositories/student-achievement.repository.interface';
import { BADGE_DEFINITION_REPOSITORY } from './domain/repositories/badge-definition.repository.interface';
import { STUDENT_BADGE_REPOSITORY } from './domain/repositories/student-badge.repository.interface';
import { LEADERBOARD_ENTRY_REPOSITORY } from './domain/repositories/leaderboard-entry.repository.interface';
import { REWARD_RULE_REPOSITORY } from './domain/repositories/reward-rule.repository.interface';

// Repository implementations
import { GamificationConfigRepository } from './infrastructure/repositories/gamification-config.repository';
import { PointTransactionRepository } from './infrastructure/repositories/point-transaction.repository';
import { StudentPointsRepository } from './infrastructure/repositories/student-points.repository';
import { StreakRepository } from './infrastructure/repositories/streak.repository';
import { AchievementDefinitionRepository } from './infrastructure/repositories/achievement-definition.repository';
import { StudentAchievementRepository } from './infrastructure/repositories/student-achievement.repository';
import { BadgeDefinitionRepository } from './infrastructure/repositories/badge-definition.repository';
import { StudentBadgeRepository } from './infrastructure/repositories/student-badge.repository';
import { LeaderboardEntryRepository } from './infrastructure/repositories/leaderboard-entry.repository';
import { RewardRuleRepository } from './infrastructure/repositories/reward-rule.repository';

// Application services
import { PointsEngineService } from './application/services/points-engine.service';
import { StreakService } from './application/services/streak.service';
import { AchievementEngineService } from './application/services/achievement-engine.service';
import { BadgeEngineService } from './application/services/badge-engine.service';
import { RewardRulesEngineService } from './application/services/reward-rules-engine.service';
import { LeaderboardService } from './application/services/leaderboard.service';
import { GamificationStatsService } from './application/services/gamification-stats.service';
import { AgeAdaptiveService } from './application/services/age-adaptive.service';

// Infrastructure
import { GamificationController } from './infrastructure/controllers/gamification.controller';
import { GamificationEventListener } from './infrastructure/listeners/gamification-event.listener';

/**
 * GamificationModule — Phase 12D
 *
 * Provides the complete gamification engine:
 * - Points ledger (append-only transactions + materialised student_points)
 * - Streak tracking (daily / weekly / monthly)
 * - Achievement system (9 predefined types + custom, auto + manual award)
 * - Badge system (5 tiers, 4 types, auto/manual/seasonal/event)
 * - Leaderboards (student/circle/sheikh/tenant × daily/weekly/monthly/yearly/all-time)
 * - Reward rules engine (tenant-configurable IF/THEN rules)
 * - Statistics aggregation
 * - Age-adaptive profile metadata
 * - Event-driven integration (memorization, review, exam, attendance events)
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GamificationConfig.name, schema: GamificationConfigSchema },
      { name: PointTransaction.name, schema: PointTransactionSchema },
      { name: StudentPoints.name, schema: StudentPointsSchema },
      { name: Streak.name, schema: StreakSchema },
      { name: AchievementDefinition.name, schema: AchievementDefinitionSchema },
      { name: StudentAchievement.name, schema: StudentAchievementSchema },
      { name: BadgeDefinition.name, schema: BadgeDefinitionSchema },
      { name: StudentBadge.name, schema: StudentBadgeSchema },
      { name: LeaderboardEntry.name, schema: LeaderboardEntrySchema },
      { name: RewardRule.name, schema: RewardRuleSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
  ],
  controllers: [GamificationController],
  providers: [
    // Repositories
    { provide: GAMIFICATION_CONFIG_REPOSITORY,  useClass: GamificationConfigRepository },
    { provide: POINT_TRANSACTION_REPOSITORY,    useClass: PointTransactionRepository },
    { provide: STUDENT_POINTS_REPOSITORY,       useClass: StudentPointsRepository },
    { provide: STREAK_REPOSITORY,               useClass: StreakRepository },
    { provide: ACHIEVEMENT_DEFINITION_REPOSITORY, useClass: AchievementDefinitionRepository },
    { provide: STUDENT_ACHIEVEMENT_REPOSITORY,  useClass: StudentAchievementRepository },
    { provide: BADGE_DEFINITION_REPOSITORY,     useClass: BadgeDefinitionRepository },
    { provide: STUDENT_BADGE_REPOSITORY,        useClass: StudentBadgeRepository },
    { provide: LEADERBOARD_ENTRY_REPOSITORY,    useClass: LeaderboardEntryRepository },
    { provide: REWARD_RULE_REPOSITORY,          useClass: RewardRuleRepository },
    // Application services
    PointsEngineService,
    StreakService,
    AchievementEngineService,
    BadgeEngineService,
    RewardRulesEngineService,
    LeaderboardService,
    GamificationStatsService,
    AgeAdaptiveService,
    // Event listener
    GamificationEventListener,
  ],
  exports: [
    PointsEngineService,
    StreakService,
    AchievementEngineService,
    BadgeEngineService,
    LeaderboardService,
    GamificationStatsService,
    AgeAdaptiveService,
  ],
})
export class GamificationModule {}
