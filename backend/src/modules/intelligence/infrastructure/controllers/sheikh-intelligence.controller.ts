import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { PERMISSIONS } from '@shared/authorization/permission-registry';

import { GetSheikhInsightsUseCase } from '../../application/use-cases/get-sheikh-insights.use-case';
import { SheikhInsightDto } from '../../application/dtos/sheikh-insight.dto';

/**
 * SheikhIntelligenceController — Phase 13A.
 *
 * Sheikh-facing intelligence endpoints. Provides class-level analytics
 * and individual student performance briefs for all assigned students.
 *
 * Base path: /intelligence/sheikhs/:sheikhId
 */
@ApiTags('Intelligence')
@Controller('intelligence/sheikhs')
export class SheikhIntelligenceController {
  constructor(private readonly getSheikhInsights: GetSheikhInsightsUseCase) {}

  @Get(':sheikhId/insights')
  @RequirePermissions(PERMISSIONS.INTELLIGENCE.READ!)
  @ApiOperation({
    summary: 'Get sheikh class intelligence insights',
    description:
      'Returns class-level analytics and per-student performance briefs for all ' +
      'students assigned to a sheikh. Includes top performers, students needing ' +
      'attention, class averages, and individual recommendations. ' +
      'Sheikhs can only access their own class; admins/supervisors are unrestricted.',
  })
  @ApiParam({ name: 'sheikhId', description: 'Sheikh profile ID' })
  async getInsights(
    @CurrentUser() user: AccessTokenPayload,
    @Param('sheikhId') sheikhId: string,
  ): Promise<SheikhInsightDto> {
    const insight = await this.getSheikhInsights.execute(user, sheikhId);
    return {
      sheikhId: insight.sheikhId,
      generatedAt: insight.generatedAt.toISOString(),
      totalStudents: insight.totalStudents,
      students: insight.students.map(s => ({
        studentId: s.studentId,
        memorizationScore: s.memorizationScore,
        revisionScore: s.revisionScore,
        attendanceScore: s.attendanceScore,
        consistencyScore: s.consistencyScore,
        forgettingRisk: s.forgettingRisk,
        difficultyIndex: s.difficultyIndex,
        totalAyahsMemorized: s.totalAyahsMemorized,
        overdueRevisionCount: s.overdueRevisionCount,
        openMistakes: s.openMistakes,
        topRecommendations: s.topRecommendations,
      })),
      topPerformers: insight.topPerformers,
      needsAttention: insight.needsAttention,
      classAggregate: insight.classAggregate,
    };
  }
}
