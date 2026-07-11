import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { GenerateMistakeInsightUseCase } from '../../application/use-cases/generate-mistake-insight.use-case';
import { GenerateRevisionRecommendationUseCase } from '../../application/use-cases/generate-revision-recommendation.use-case';
import { GenerateMemorizationRecommendationUseCase } from '../../application/use-cases/generate-memorization-recommendation.use-case';
import { GenerateForecastExplanationUseCase } from '../../application/use-cases/generate-forecast-explanation.use-case';
import { GenerateSheikhAiReportUseCase } from '../../application/use-cases/generate-sheikh-ai-report.use-case';
import { GenerateParentAiReportUseCase } from '../../application/use-cases/generate-parent-ai-report.use-case';
import { ListAiInsightsUseCase } from '../../application/use-cases/list-ai-insights.use-case';
import { AcknowledgeAiInsightUseCase } from '../../application/use-cases/acknowledge-ai-insight.use-case';

/**
 * AI API — `/ai` (Phase 11: AI Learning Intelligence Architecture).
 *
 * Every GET route auto-generates on cache miss (gated by budget) and
 * returns the cached report otherwise — clients never need to know
 * whether a call reached Moonshot or not. `force=true` bypasses the
 * cache and is restricted to Sheikh/Supervisor/Admin (enforced inside
 * each use-case) to keep AI spend predictable.
 *
 * RBAC summary:
 *  GET   /ai/students/:studentId/mistake-insight            → AI.READ (student-scoped)
 *  GET   /ai/students/:studentId/revision-recommendation     → AI.READ (student-scoped)
 *  GET   /ai/students/:studentId/memorization-recommendation → AI.READ (student-scoped)
 *  GET   /ai/students/:studentId/forecast-explanation        → AI.READ (student-scoped)
 *  GET   /ai/students/:studentId/insights                    → AI.READ (student-scoped) — history of all generated reports
 *  GET   /ai/sheikhs/:sheikhId/report                        → AI.READ (Sheikh: own only)
 *  GET   /ai/parents/:parentId/report                        → AI.READ (Parent: own only)
 *  PATCH /ai/reports/:reportId/acknowledge                   → AI.APPROVE (Sheikh, Supervisor, Admin)
 */
@Controller('ai')
export class AiController {
  constructor(
    private readonly mistakeInsight: GenerateMistakeInsightUseCase,
    private readonly revisionRecommendation: GenerateRevisionRecommendationUseCase,
    private readonly memorizationRecommendation: GenerateMemorizationRecommendationUseCase,
    private readonly forecastExplanation: GenerateForecastExplanationUseCase,
    private readonly sheikhReport: GenerateSheikhAiReportUseCase,
    private readonly parentReport: GenerateParentAiReportUseCase,
    private readonly listInsights: ListAiInsightsUseCase,
    private readonly acknowledgeInsight: AcknowledgeAiInsightUseCase,
  ) {}

  @Get('students/:studentId/mistake-insight')
  @RequirePermissions(PERMISSIONS.AI.READ!)
  getMistakeInsight(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Query('force') force?: string,
  ) {
    return this.mistakeInsight.execute(user, studentId, force === 'true');
  }

  @Get('students/:studentId/revision-recommendation')
  @RequirePermissions(PERMISSIONS.AI.READ!)
  getRevisionRecommendation(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Query('force') force?: string,
  ) {
    return this.revisionRecommendation.execute(user, studentId, force === 'true');
  }

  @Get('students/:studentId/memorization-recommendation')
  @RequirePermissions(PERMISSIONS.AI.READ!)
  getMemorizationRecommendation(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Query('force') force?: string,
  ) {
    return this.memorizationRecommendation.execute(user, studentId, force === 'true');
  }

  @Get('students/:studentId/forecast-explanation')
  @RequirePermissions(PERMISSIONS.AI.READ!)
  getForecastExplanation(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Query('force') force?: string,
  ) {
    return this.forecastExplanation.execute(user, studentId, force === 'true');
  }

  @Get('students/:studentId/insights')
  @RequirePermissions(PERMISSIONS.AI.READ!)
  listStudentInsights(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listInsights.execute(user, studentId, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Get('sheikhs/:sheikhId/report')
  @RequirePermissions(PERMISSIONS.AI.READ!)
  getSheikhReport(
    @CurrentUser() user: AccessTokenPayload,
    @Param('sheikhId') sheikhId: string,
    @Query('force') force?: string,
  ) {
    return this.sheikhReport.execute(user, sheikhId, force === 'true');
  }

  @Get('parents/:parentId/report')
  @RequirePermissions(PERMISSIONS.AI.READ!)
  getParentReport(
    @CurrentUser() user: AccessTokenPayload,
    @Param('parentId') parentId: string,
    @Query('force') force?: string,
  ) {
    return this.parentReport.execute(user, parentId, force === 'true');
  }

  @Patch('reports/:reportId/acknowledge')
  @RequirePermissions(PERMISSIONS.AI.APPROVE!)
  acknowledge(@CurrentUser() user: AccessTokenPayload, @Param('reportId') reportId: string) {
    return this.acknowledgeInsight.execute(user, reportId);
  }
}
