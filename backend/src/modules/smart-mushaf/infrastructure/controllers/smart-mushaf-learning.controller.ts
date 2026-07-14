import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { DetectMistakesUseCase } from '../../application/use-cases/detect-mistakes.use-case';
import { GetWeaknessSummaryUseCase } from '@modules/ayah-performance/application/use-cases/get-weakness-summary.use-case';
import { GetOverdueRevisionsUseCase } from '@modules/ayah-performance/application/use-cases/get-overdue-revisions.use-case';

class DetectMistakesDto {
  recitedText!: string;
  surahNumber!: number;
  ayahNumber!: number;
}

/**
 * Smart Mushaf — Learning Intelligence API (Phase 12B)
 *
 * RBAC:
 *  POST /smart-mushaf/detect-mistakes                          → SMART_MUSHAF.CREATE (sheikh, admin)
 *  GET  /smart-mushaf/weakness/students/:studentId             → SMART_MUSHAF.READ
 *  GET  /smart-mushaf/revisions/due/students/:studentId        → SMART_MUSHAF.READ
 */
@Controller('smart-mushaf')
export class SmartMushafLearningController {
  constructor(
    private readonly detectMistakes: DetectMistakesUseCase,
    private readonly getWeakness: GetWeaknessSummaryUseCase,
    private readonly getOverdue: GetOverdueRevisionsUseCase,
  ) {}

  /**
   * Stateless deterministic mistake detection.
   * Returns detected mistakes for sheikh review — does NOT persist anything.
   */
  @Post('detect-mistakes')
  @RequirePermissions(PERMISSIONS.SMART_MUSHAF.CREATE!)
  detectMistakesEndpoint(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: DetectMistakesDto,
  ) {
    return this.detectMistakes.execute(user, {
      recitedText: dto.recitedText,
      surahNumber: Number(dto.surahNumber),
      ayahNumber: Number(dto.ayahNumber),
    });
  }

  /** Per-surah weakness summary + top-20 weakest ayahs for a student. */
  @Get('weakness/students/:studentId')
  @RequirePermissions(PERMISSIONS.SMART_MUSHAF.READ!)
  weaknessSummary(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.getWeakness.execute(user, studentId);
  }

  /** SM-2 overdue revisions — all ayahs where nextReviewDue <= now. */
  @Get('revisions/due/students/:studentId')
  @RequirePermissions(PERMISSIONS.SMART_MUSHAF.READ!)
  overdueRevisions(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.getOverdue.execute(user, studentId);
  }
}
