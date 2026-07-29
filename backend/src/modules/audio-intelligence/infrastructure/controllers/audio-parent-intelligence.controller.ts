import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { RequirePermissions } from '@shared/authorization/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';

import { GetAudioParentInsightsUseCase } from '../../application/use-cases/get-audio-parent-insights.use-case';
import type { AudioParentInsight } from '../../application/use-cases/get-audio-parent-insights.use-case';
import {
  AudioParentInsightDto,
  AudioChildSummaryDto,
} from '../../dto/audio-insights-response.dto';

@ApiTags('Audio Intelligence — Parent')
@ApiBearerAuth()
@Controller('audio-intelligence/parents')
export class AudioParentIntelligenceController {
  constructor(private readonly getInsights: GetAudioParentInsightsUseCase) {}

  @Get(':parentId/insights')
  @RequirePermissions(PERMISSIONS.AUDIO_INTELLIGENCE!.READ!)
  @ApiOperation({
    summary: 'Get audio intelligence insights for a parent',
    description:
      'Returns a summary of audio recitation analysis for all children linked to the parent. ' +
      'Includes per-child composite scores, tajweed scores, mistake counts, and top recommendations. ' +
      'All data is derived from local audio analysis — no external AI services involved.\n\n' +
      '**RBAC:**\n' +
      '- `PARENT` → own children only\n' +
      '- `SUPERVISOR` / `TENANT_ADMIN` → any parent',
  })
  @ApiParam({ name: 'parentId', description: 'Parent profile ID' })
  @ApiResponse({ status: 200, type: AudioParentInsightDto })
  async getParentInsights(
    @CurrentUser() user: AccessTokenPayload,
    @Param('parentId') parentId: string,
  ): Promise<AudioParentInsightDto> {
    const insight = await this.getInsights.execute(user, parentId);
    return this.toDto(insight);
  }

  private toDto(insight: AudioParentInsight): AudioParentInsightDto {
    return {
      parentId: insight.parentId,
      generatedAt: insight.generatedAt.toISOString(),
      children: insight.children.map(
        (c): AudioChildSummaryDto => ({
          studentId: c.studentId,
          totalSessions: c.totalSessions,
          completedSessions: c.completedSessions,
          averageCompositeScore: c.averageCompositeScore,
          latestCompositeScore: c.latestCompositeScore,
          latestTier: c.latestTier,
          totalMistakes: c.totalMistakes,
          criticalMistakes: c.criticalMistakes,
          averageTajweedScore: c.averageTajweedScore,
          lastSessionDate: c.lastSessionDate,
        }),
      ),
      aggregate: {
        totalSessionsAllChildren: insight.aggregate.totalSessionsAllChildren,
        averageCompositeScoreAllChildren: insight.aggregate.averageCompositeScoreAllChildren,
        childrenWithCriticalMistakes: insight.aggregate.childrenWithCriticalMistakes,
      },
    };
  }
}
