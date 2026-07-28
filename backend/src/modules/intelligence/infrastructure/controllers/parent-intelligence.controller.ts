import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { PERMISSIONS } from '@shared/authorization/permission-registry';

import { GetParentInsightsUseCase } from '../../application/use-cases/get-parent-insights.use-case';
import { ParentInsightDto } from '../../application/dtos/parent-insight.dto';

/**
 * ParentIntelligenceController — Phase 13A.
 *
 * Parent-facing intelligence endpoints. Returns a child-centric insight
 * bundle covering all of a parent's linked students.
 *
 * Base path: /intelligence/parents/:parentId
 */
@ApiTags('Intelligence')
@Controller('intelligence/parents')
export class ParentIntelligenceController {
  constructor(private readonly getParentInsights: GetParentInsightsUseCase) {}

  @Get(':parentId/insights')
  @RequirePermissions(PERMISSIONS.INTELLIGENCE.READ!)
  @ApiOperation({
    summary: 'Get parent intelligence insights',
    description:
      'Returns a curated intelligence bundle covering all children linked to ' +
      'a parent profile. Includes per-child performance scores, forgetting risk, ' +
      'top recommendations, and an aggregate household summary. ' +
      'Parents can only access their own children; admins/supervisors are unrestricted.',
  })
  @ApiParam({ name: 'parentId', description: 'Parent profile ID' })
  async getInsights(
    @CurrentUser() user: AccessTokenPayload,
    @Param('parentId') parentId: string,
  ): Promise<ParentInsightDto> {
    const insight = await this.getParentInsights.execute(user, parentId);
    return {
      parentId: insight.parentId,
      generatedAt: insight.generatedAt.toISOString(),
      children: insight.children.map(c => ({
        studentId: c.studentId,
        memorizationScore: c.memorizationScore,
        revisionScore: c.revisionScore,
        attendanceScore: c.attendanceScore,
        consistencyScore: c.consistencyScore,
        forgettingRisk: c.forgettingRisk,
        totalAyahsMemorized: c.totalAyahsMemorized,
        memorizationPercentage: c.memorizationPercentage,
        overdueRevisionCount: c.overdueRevisionCount,
        openMistakes: c.openMistakes,
        recommendations: c.recommendations,
        lastMemorizationDate: c.lastMemorizationDate,
        lastRevisionDate: c.lastRevisionDate,
        activeDaysLast30: c.activeDaysLast30,
      })),
      aggregate: insight.aggregate,
    };
  }
}
