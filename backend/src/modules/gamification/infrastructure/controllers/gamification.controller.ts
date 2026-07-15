import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { PointsEngineService } from '../../application/services/points-engine.service';
import { AchievementEngineService } from '../../application/services/achievement-engine.service';
import { BadgeEngineService } from '../../application/services/badge-engine.service';
import { LeaderboardService } from '../../application/services/leaderboard.service';
import { GamificationStatsService } from '../../application/services/gamification-stats.service';
import { AgeAdaptiveService } from '../../application/services/age-adaptive.service';
import { RewardRulesEngineService } from '../../application/services/reward-rules-engine.service';
import { ManualAwardAchievementDto, ManualAwardBadgeDto } from '../../application/dto/manual-award.dto';
import { CreateRewardRuleDto } from '../../application/dto/create-reward-rule.dto';
import { UpdateRewardRuleDto } from '../../application/dto/update-reward-rule.dto';
import { CreateBadgeDefinitionDto } from '../../application/dto/create-badge-definition.dto';
import { ConfigurePointsDto } from '../../application/dto/configure-points.dto';
import { LeaderboardEntityType, LeaderboardPeriod, AgeGroup } from '@shared/enums/gamification.enum';
import { BadgeType } from '@shared/enums/gamification.enum';

/**
 * Gamification API — `/gamification`
 *
 * RBAC summary:
 *  GET  /gamification/students/:studentId/points          → GAMIFICATION.READ
 *  GET  /gamification/students/:studentId/achievements    → GAMIFICATION.READ
 *  GET  /gamification/students/:studentId/badges          → GAMIFICATION.READ
 *  GET  /gamification/students/:studentId/stats           → GAMIFICATION.READ
 *  GET  /gamification/students/:studentId/age-profile     → GAMIFICATION.READ
 *  GET  /gamification/leaderboard                         → GAMIFICATION.READ
 *  POST /gamification/achievements/manual-award           → GAMIFICATION.AWARD (sheikh/admin)
 *  POST /gamification/badges/manual-award                 → GAMIFICATION.AWARD (sheikh/admin)
 *  GET  /gamification/config                              → GAMIFICATION.READ
 *  PUT  /gamification/config                              → GAMIFICATION.UPDATE (admin)
 *  GET  /gamification/reward-rules                        → GAMIFICATION.READ
 *  POST /gamification/reward-rules                        → GAMIFICATION.CREATE (admin)
 *  PATCH /gamification/reward-rules/:id                   → GAMIFICATION.UPDATE (admin)
 *  DELETE /gamification/reward-rules/:id                  → GAMIFICATION.DELETE (admin)
 *  GET  /gamification/badges/definitions                  → GAMIFICATION.READ
 *  POST /gamification/badges/definitions                  → GAMIFICATION.CREATE (admin)
 *  GET  /gamification/achievements/definitions            → GAMIFICATION.READ
 */
@Controller('gamification')
export class GamificationController {
  constructor(
    private readonly pointsEngine: PointsEngineService,
    private readonly achievementEngine: AchievementEngineService,
    private readonly badgeEngine: BadgeEngineService,
    private readonly leaderboardService: LeaderboardService,
    private readonly statsService: GamificationStatsService,
    private readonly ageAdaptiveService: AgeAdaptiveService,
    private readonly rewardRulesEngine: RewardRulesEngineService,
  ) {}

  // ── Student-scoped reads ──────────────────────────────────────────────────

  @Get('students/:studentId/points')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.READ!)
  getStudentPoints(@Param('studentId') studentId: string, @CurrentUser() user: AccessTokenPayload) {
    return this.pointsEngine.getStudentPoints(user.tenantId, studentId);
  }

  @Get('students/:studentId/achievements')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.READ!)
  getStudentAchievements(@Param('studentId') studentId: string, @CurrentUser() user: AccessTokenPayload) {
    return this.achievementEngine.getStudentAchievements(user.tenantId, studentId);
  }

  @Get('students/:studentId/badges')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.READ!)
  getStudentBadges(@Param('studentId') studentId: string, @CurrentUser() user: AccessTokenPayload) {
    return this.badgeEngine.getStudentBadges(user.tenantId, studentId);
  }

  @Get('students/:studentId/stats')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.READ!)
  getStudentStats(@Param('studentId') studentId: string, @CurrentUser() user: AccessTokenPayload) {
    return this.statsService.getStudentStats(user.tenantId, studentId);
  }

  @Get('students/:studentId/transactions')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.READ!)
  getStudentTransactions(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Query('limit') limit?: string,
  ) {
    return this.pointsEngine.getStudentTransactions(user.tenantId, studentId, limit ? parseInt(limit, 10) : 20);
  }

  @Get('students/:studentId/ranking')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.READ!)
  getStudentRanking(@Param('studentId') studentId: string, @CurrentUser() user: AccessTokenPayload) {
    return this.leaderboardService.getStudentRanking(user.tenantId, studentId);
  }

  /**
   * Age-adaptive profile metadata — frontend uses this to adapt UX.
   * dob query param: YYYY-MM-DD
   */
  @Get('age-profile')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.READ!)
  getAgeProfile(
    @Query('dob') dob: string,
    @Query('ageGroup') ageGroup?: AgeGroup,
  ) {
    if (ageGroup) {
      return this.ageAdaptiveService.getProfileMetadata(ageGroup);
    }
    if (dob) {
      return this.ageAdaptiveService.getMetadataFromDob(dob);
    }
    return this.ageAdaptiveService.getProfileMetadata(AgeGroup.ADULT);
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────

  @Get('leaderboard')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.READ!)
  getLeaderboard(
    @CurrentUser() user: AccessTokenPayload,
    @Query('entityType') entityType?: LeaderboardEntityType,
    @Query('period') period?: LeaderboardPeriod,
    @Query('periodKey') periodKey?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaderboardService.getLeaderboard(
      user.tenantId,
      entityType ?? LeaderboardEntityType.STUDENT,
      period ?? LeaderboardPeriod.ALL_TIME,
      periodKey,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  // ── Manual awards (Sheikh / Admin) ────────────────────────────────────────

  @Post('achievements/manual-award')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.GAMIFICATION.AWARD!)
  manualAwardAchievement(@Body() dto: ManualAwardAchievementDto, @CurrentUser() user: AccessTokenPayload) {
    return this.achievementEngine.manualAward(
      user.tenantId,
      dto.studentId,
      dto.achievementType,
      user.sub,
      dto.note,
    );
  }

  @Post('badges/manual-award')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.GAMIFICATION.AWARD!)
  manualAwardBadge(@Body() dto: ManualAwardBadgeDto, @CurrentUser() user: AccessTokenPayload) {
    return this.badgeEngine.manualAward(
      user.tenantId,
      dto.studentId,
      dto.badgeDefinitionId,
      user.sub,
      dto.note,
    );
  }

  // ── Achievement definitions ───────────────────────────────────────────────

  @Get('achievements/definitions')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.READ!)
  listAchievementDefinitions(@CurrentUser() user: AccessTokenPayload) {
    return this.achievementEngine.listDefinitions(user.tenantId);
  }

  @Post('achievements/seed')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.GAMIFICATION.CREATE!)
  seedAchievements(@CurrentUser() user: AccessTokenPayload) {
    return this.achievementEngine.seedDefaultAchievements(user.tenantId);
  }

  // ── Badge definitions ─────────────────────────────────────────────────────

  @Get('badges/definitions')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.READ!)
  listBadgeDefinitions(
    @CurrentUser() user: AccessTokenPayload,
    @Query('type') type?: BadgeType,
  ) {
    return this.badgeEngine.listDefinitions(user.tenantId);
  }

  @Post('badges/definitions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.GAMIFICATION.CREATE!)
  createBadgeDefinition(@Body() dto: CreateBadgeDefinitionDto, @CurrentUser() user: AccessTokenPayload) {
    return this.badgeEngine.createDefinition(user.tenantId, {
      ...dto,
      tenantId: user.tenantId,
      type: dto.type ?? BadgeType.MANUAL,
      createdBy: user.sub,
    });
  }

  @Patch('badges/definitions/:id')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.UPDATE!)
  updateBadgeDefinition(
    @Param('id') id: string,
    @Body() dto: Partial<CreateBadgeDefinitionDto>,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.badgeEngine.updateDefinition(user.tenantId, id, dto as never);
  }

  @Delete('badges/definitions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.GAMIFICATION.DELETE!)
  deleteBadgeDefinition(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.badgeEngine.deleteDefinition(user.tenantId, id);
  }

  // ── Config (Admin) ────────────────────────────────────────────────────────

  @Get('config')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.READ!)
  getConfig(@CurrentUser() user: AccessTokenPayload) {
    return this.pointsEngine.getConfig(user.tenantId);
  }

  @Patch('config')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.UPDATE!)
  updateConfig(@Body() dto: ConfigurePointsDto, @CurrentUser() user: AccessTokenPayload) {
    return this.pointsEngine.updateConfig(user.tenantId, dto as Record<string, unknown>);
  }

  // ── Reward rules (Admin) ──────────────────────────────────────────────────

  @Get('reward-rules')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.READ!)
  listRewardRules(@CurrentUser() user: AccessTokenPayload) {
    return this.rewardRulesEngine.listRules(user.tenantId);
  }

  @Post('reward-rules')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.GAMIFICATION.CREATE!)
  createRewardRule(@Body() dto: CreateRewardRuleDto, @CurrentUser() user: AccessTokenPayload) {
    return this.rewardRulesEngine.createRule(user.tenantId, {
      ...dto,
      tenantId: user.tenantId,
      createdBy: user.sub,
    });
  }

  @Patch('reward-rules/:id')
  @RequirePermissions(PERMISSIONS.GAMIFICATION.UPDATE!)
  updateRewardRule(
    @Param('id') id: string,
    @Body() dto: UpdateRewardRuleDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.rewardRulesEngine.updateRule(user.tenantId, id, dto);
  }

  @Delete('reward-rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.GAMIFICATION.DELETE!)
  deleteRewardRule(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.rewardRulesEngine.deleteRule(user.tenantId, id);
  }
}
