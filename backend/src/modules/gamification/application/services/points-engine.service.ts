import { Inject, Injectable, Logger } from '@nestjs/common';
import { PointActivityType } from '@shared/enums/gamification.enum';
import { EventDispatcherService } from '@shared/events/event-dispatcher.service';
import { PointsAwardedEvent } from '@shared/events/domain.events';
import {
  GAMIFICATION_CONFIG_REPOSITORY,
  IGamificationConfigRepository,
} from '../../domain/repositories/gamification-config.repository.interface';
import {
  POINT_TRANSACTION_REPOSITORY,
  IPointTransactionRepository,
} from '../../domain/repositories/point-transaction.repository.interface';
import {
  STUDENT_POINTS_REPOSITORY,
  IStudentPointsRepository,
} from '../../domain/repositories/student-points.repository.interface';

export interface AwardPointsResult {
  points: number;
  totalPoints: number;
  activityType: PointActivityType;
}

@Injectable()
export class PointsEngineService {
  private readonly logger = new Logger(PointsEngineService.name);

  constructor(
    @Inject(GAMIFICATION_CONFIG_REPOSITORY)
    private readonly configRepo: IGamificationConfigRepository,
    @Inject(POINT_TRANSACTION_REPOSITORY)
    private readonly transactionRepo: IPointTransactionRepository,
    @Inject(STUDENT_POINTS_REPOSITORY)
    private readonly studentPointsRepo: IStudentPointsRepository,
    private readonly events: EventDispatcherService,
  ) {}

  /**
   * Award points for a student activity. Resolves the point value from tenant
   * config (falls back to platform default if override not set), records a
   * PointTransaction, and updates the materialised StudentPoints view.
   */
  async awardPoints(
    tenantId: string,
    studentId: string,
    activityType: PointActivityType,
    opts: {
      pointOverride?: number;
      referenceId?: string;
      referenceType?: string;
      activityDate?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<AwardPointsResult> {
    const activityDate = opts.activityDate ?? new Date().toISOString().split('T')[0];

    const points =
      opts.pointOverride ??
      (await this.configRepo.getPointValue(tenantId, activityType));

    if (points <= 0) {
      return { points: 0, totalPoints: 0, activityType };
    }

    await this.transactionRepo.create({
      tenantId,
      studentId,
      activityType,
      points,
      activityDate,
      referenceId: opts.referenceId,
      referenceType: opts.referenceType,
      metadata: opts.metadata,
    });

    const updated = await this.studentPointsRepo.addPoints(
      tenantId,
      studentId,
      activityType,
      points,
      activityDate,
    );

    const totalPoints = updated.totalPoints;

    this.logger.log(
      `Awarded ${points} pts [${activityType}] to student ${studentId} (tenant ${tenantId}) — total: ${totalPoints}`,
    );

    this.events.pointsAwarded(new PointsAwardedEvent(studentId, tenantId, activityType, points, totalPoints));

    return { points, totalPoints, activityType };
  }

  /**
   * Award bonus points without triggering further engine checks.
   * Used internally by AchievementEngine and RewardRulesEngine.
   */
  async awardBonusPoints(
    tenantId: string,
    studentId: string,
    bonusPoints: number,
    reason: string,
    activityDate: string,
  ): Promise<void> {
    if (bonusPoints <= 0) return;

    await this.transactionRepo.create({
      tenantId,
      studentId,
      activityType: PointActivityType.COMMUNITY_PARTICIPATION, // reuse as 'bonus' bucket
      points: bonusPoints,
      activityDate,
      referenceType: 'bonus',
      metadata: { reason },
    });

    await this.studentPointsRepo.addPoints(
      tenantId,
      studentId,
      PointActivityType.COMMUNITY_PARTICIPATION,
      bonusPoints,
      activityDate,
    );
  }

  async getStudentPoints(tenantId: string, studentId: string) {
    return this.studentPointsRepo.findByStudent(tenantId, studentId);
  }

  async getStudentTransactions(tenantId: string, studentId: string, limit = 20) {
    return this.transactionRepo.findByStudent(tenantId, studentId, limit);
  }

  async getBreakdown(tenantId: string, studentId: string) {
    return this.transactionRepo.breakdownByActivity(tenantId, studentId);
  }

  async getConfig(tenantId: string) {
    return this.configRepo.findByTenantId(tenantId);
  }

  async updateConfig(tenantId: string, data: Record<string, unknown>) {
    return this.configRepo.upsert(tenantId, data as never);
  }
}
