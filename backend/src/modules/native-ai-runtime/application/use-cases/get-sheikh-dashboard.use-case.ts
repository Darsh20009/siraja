import { Injectable } from '@nestjs/common';
import { SheikhDashboardProvider } from '../providers/sheikh-dashboard.provider';
import type { GetSheikhDashboardRequestDto, GetSheikhDashboardResponseDto } from '../dtos/sheikh-dashboard.dto';

/**
 * GetSheikhDashboardUseCase — builds the AI dashboard payload for a sheikh,
 * serialised to the response DTO.
 */
@Injectable()
export class GetSheikhDashboardUseCase {
  constructor(private readonly provider: SheikhDashboardProvider) {}

  execute(
    dto: GetSheikhDashboardRequestDto,
    tenantId: string,
  ): GetSheikhDashboardResponseDto {
    const data = this.provider.build({
      sheikhId: dto.sheikhId,
      tenantId,
      students: dto.students,
    });

    return {
      sheikhId: data.sheikhId,
      tenantId: data.tenantId,
      generatedAt: data.generatedAt.toISOString(),
      studentSummaries: data.studentSummaries,
      groupStats: data.groupStats,
      atRiskStudents: data.atRiskStudents.map((r) => ({
        ...r,
        assessedAt: r.assessedAt.toISOString(),
      })),
      topRecommendations: data.topRecommendations,
    };
  }
}
