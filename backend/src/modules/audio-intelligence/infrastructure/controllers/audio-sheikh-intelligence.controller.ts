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

import { GetAudioSheikhInsightsUseCase } from '../../application/use-cases/get-audio-sheikh-insights.use-case';
import type { AudioSheikhInsight } from '../../application/use-cases/get-audio-sheikh-insights.use-case';
import {
  AudioSheikhInsightDto,
  AudioStudentBriefDto,
} from '../../dto/audio-insights-response.dto';

@ApiTags('Audio Intelligence — Sheikh')
@ApiBearerAuth()
@Controller('audio-intelligence/sheikhs')
export class AudioSheikhIntelligenceController {
  constructor(private readonly getInsights: GetAudioSheikhInsightsUseCase) {}

  @Get(':sheikhId/insights')
  @RequirePermissions(PERMISSIONS.AUDIO_INTELLIGENCE!.READ!)
  @ApiOperation({
    summary: 'Get audio intelligence insights for a sheikh',
    description:
      'Returns a class-level summary of audio recitation analysis across all students assigned ' +
      'to the sheikh. Includes individual student briefs, attention flags, top performers, ' +
      'and class-wide aggregates.\n\n' +
      'All data derived from local audio analysis — no external AI services involved.\n\n' +
      '**RBAC:**\n' +
      '- `SHEIKH` → own students only\n' +
      '- `SUPERVISOR` / `TENANT_ADMIN` → any sheikh',
  })
  @ApiParam({ name: 'sheikhId', description: 'Sheikh profile ID' })
  @ApiResponse({ status: 200, type: AudioSheikhInsightDto })
  async getSheikhInsights(
    @CurrentUser() user: AccessTokenPayload,
    @Param('sheikhId') sheikhId: string,
  ): Promise<AudioSheikhInsightDto> {
    const insight = await this.getInsights.execute(user, sheikhId);
    return this.toDto(insight);
  }

  private toDto(insight: AudioSheikhInsight): AudioSheikhInsightDto {
    return {
      sheikhId: insight.sheikhId,
      generatedAt: insight.generatedAt.toISOString(),
      totalStudents: insight.totalStudents,
      students: insight.students.map(
        (s): AudioStudentBriefDto => ({
          studentId: s.studentId,
          totalSessions: s.totalSessions,
          completedSessions: s.completedSessions,
          averageCompositeScore: s.averageCompositeScore,
          latestCompositeScore: s.latestCompositeScore,
          latestTier: s.latestTier,
          totalMistakes: s.totalMistakes,
          criticalMistakes: s.criticalMistakes,
          averageTajweedScore: s.averageTajweedScore,
          averageAccuracyScore: s.averageAccuracyScore,
          needsAttention: s.needsAttention,
          lastSessionDate: s.lastSessionDate,
        }),
      ),
      needsAttention: insight.needsAttention,
      topPerformers: insight.topPerformers,
      classAggregate: {
        averageCompositeScore: insight.classAggregate.averageCompositeScore,
        averageTajweedScore: insight.classAggregate.averageTajweedScore,
        averageAccuracyScore: insight.classAggregate.averageAccuracyScore,
        totalMistakes: insight.classAggregate.totalMistakes,
        totalCriticalMistakes: insight.classAggregate.totalCriticalMistakes,
        studentsWithRecentSessions: insight.classAggregate.studentsWithRecentSessions,
      },
    };
  }
}
