import { Injectable } from '@nestjs/common';
import { ParentReportProvider } from '../providers/parent-report.provider';
import type { GenerateParentReportRequestDto, GenerateParentReportResponseDto } from '../dtos/parent-report.dto';

/**
 * GenerateParentReportUseCase — delegates to ParentReportProvider and
 * serialises the result to the response DTO.
 */
@Injectable()
export class GenerateParentReportUseCase {
  constructor(private readonly provider: ParentReportProvider) {}

  execute(
    dto: GenerateParentReportRequestDto,
    tenantId: string,
  ): GenerateParentReportResponseDto {
    const report = this.provider.generate({
      studentId: dto.studentId,
      studentName: dto.studentName,
      tenantId,
      periodFrom: new Date(dto.periodFrom),
      periodTo: new Date(dto.periodTo),
      weeklyVelocities: dto.weeklyVelocities,
      sessions: dto.sessions,
      targetAyahs: dto.targetAyahs,
      currentProgress: dto.currentProgress,
      burdenScore: dto.burdenScore,
      tajweedScore: dto.tajweedScore,
      daysSinceLastSession: dto.daysSinceLastSession,
      currentDifficultyLevel: dto.currentDifficultyLevel,
      streakDays: dto.streakDays,
      timelineEvents: dto.timelineEvents?.map((e) => ({
        type: e.type as never,
        timestamp: new Date(e.timestamp),
        data: e.data,
        significance: e.significance as never,
      })),
    });

    return {
      studentId: report.studentId,
      studentName: report.studentName,
      generatedAt: report.generatedAt.toISOString(),
      period: {
        from: report.period.from.toISOString(),
        to: report.period.to.toISOString(),
      },
      summary: report.summary,
      progressSnapshot: report.progressSnapshot,
      riskAssessment: {
        ...report.riskAssessment,
        assessedAt: report.riskAssessment.assessedAt.toISOString(),
      },
      topRecommendations: report.topRecommendations,
      forecast: {
        ...report.forecast,
        estimatedCompletionDate: report.forecast.estimatedCompletionDate.toISOString(),
        confidenceLow: report.forecast.confidenceLow.toISOString(),
        confidenceHigh: report.forecast.confidenceHigh.toISOString(),
        milestones: report.forecast.milestones.map((m) => ({
          ...m,
          estimatedDate: m.estimatedDate.toISOString(),
        })),
      },
      timeline: {
        ...report.timeline,
        periodStart: report.timeline.periodStart.toISOString(),
        periodEnd: report.timeline.periodEnd.toISOString(),
        events: report.timeline.events.map((e) => ({
          ...e,
          timestamp: e.timestamp.toISOString(),
        })),
      },
    };
  }
}
