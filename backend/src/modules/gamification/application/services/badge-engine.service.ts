import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BadgeTier, BadgeType } from '@shared/enums/gamification.enum';
import { EventDispatcherService } from '@shared/events/event-dispatcher.service';
import { BadgeAwardedEvent } from '@shared/events/domain.events';
import {
  BADGE_DEFINITION_REPOSITORY,
  IBadgeDefinitionRepository,
  CreateBadgeDefinitionData,
} from '../../domain/repositories/badge-definition.repository.interface';
import {
  STUDENT_BADGE_REPOSITORY,
  IStudentBadgeRepository,
} from '../../domain/repositories/student-badge.repository.interface';
import { PointsEngineService } from './points-engine.service';

@Injectable()
export class BadgeEngineService {
  private readonly logger = new Logger(BadgeEngineService.name);

  constructor(
    @Inject(BADGE_DEFINITION_REPOSITORY)
    private readonly badgeDefRepo: IBadgeDefinitionRepository,
    @Inject(STUDENT_BADGE_REPOSITORY)
    private readonly studentBadgeRepo: IStudentBadgeRepository,
    private readonly pointsEngine: PointsEngineService,
    private readonly events: EventDispatcherService,
  ) {}

  /** Award a badge by definition ID. Called from RewardRulesEngine (rule trigger) or manually. */
  async awardBadge(
    tenantId: string,
    studentId: string,
    badgeDefinitionId: string,
    awardedBy: 'automatic' | 'manual' | 'rule',
    opts: { awardedByUserId?: string; triggeredByRuleId?: string; note?: string } = {},
  ): Promise<boolean> {
    const def = await this.badgeDefRepo.findById(tenantId, badgeDefinitionId);
    if (!def) {
      this.logger.warn(`Badge definition ${badgeDefinitionId} not found in tenant ${tenantId}`);
      return false;
    }

    // Idempotency: don't re-award unless the badge type is seasonal/event
    if (def.type === BadgeType.AUTOMATIC || def.type === BadgeType.MANUAL) {
      const already = await this.studentBadgeRepo.hasBadge(tenantId, studentId, badgeDefinitionId);
      if (already) return false;
    }

    const now = new Date().toISOString().split('T')[0];
    await this.studentBadgeRepo.create({
      tenantId,
      studentId,
      badgeId: badgeDefinitionId,
      awardedAt: now,
      awardedBy,
      awardedByUserId: opts.awardedByUserId,
      triggeredByRuleId: opts.triggeredByRuleId,
      note: opts.note,
    });

    if (def.bonusPoints > 0) {
      await this.pointsEngine.awardBonusPoints(tenantId, studentId, def.bonusPoints, `badge:${def.name}`, now);
    }

    this.events.badgeAwarded(new BadgeAwardedEvent(studentId, tenantId, def.name, def.tier));
    this.logger.log(`Badge awarded [${def.name}] (${def.tier}) to student ${studentId}`);
    return true;
  }

  /** Manual award by sheikh/admin. */
  async manualAward(
    tenantId: string,
    studentId: string,
    badgeDefinitionId: string,
    awardedByUserId: string,
    note?: string,
  ): Promise<void> {
    const def = await this.badgeDefRepo.findById(tenantId, badgeDefinitionId);
    if (!def) throw new NotFoundException(`Badge '${badgeDefinitionId}' not found`);

    await this.awardBadge(tenantId, studentId, badgeDefinitionId, 'manual', { awardedByUserId, note });
  }

  async getStudentBadges(tenantId: string, studentId: string) {
    return this.studentBadgeRepo.findByStudent(tenantId, studentId);
  }

  async listDefinitions(tenantId: string) {
    return this.badgeDefRepo.findAll(tenantId);
  }

  async createDefinition(tenantId: string, data: CreateBadgeDefinitionData) {
    return this.badgeDefRepo.create(data);
  }

  async updateDefinition(tenantId: string, id: string, data: Partial<{ name: string; description: string; isActive: boolean; tier: BadgeTier; bonusPoints: number }>) {
    return this.badgeDefRepo.update(tenantId, id, data as never);
  }

  async deleteDefinition(tenantId: string, id: string) {
    return this.badgeDefRepo.delete(tenantId, id);
  }
}
