import { Injectable } from '@nestjs/common';
import { StudentTimelineProvider } from '../providers/student-timeline.provider';
import type { GetStudentTimelineRequestDto, GetStudentTimelineResponseDto } from '../dtos/student-timeline.dto';
import type { TimelineEventType, TimelineEventSignificance } from '../../domain/entities/student-timeline.entity';

/**
 * GetStudentTimelineUseCase — builds and AI-annotates a student's timeline.
 */
@Injectable()
export class GetStudentTimelineUseCase {
  constructor(private readonly provider: StudentTimelineProvider) {}

  execute(
    dto: GetStudentTimelineRequestDto,
    tenantId: string,
  ): GetStudentTimelineResponseDto {
    const timeline = this.provider.build(
      dto.studentId,
      tenantId,
      dto.events.map((e) => ({
        type: e.type as TimelineEventType,
        timestamp: new Date(e.timestamp),
        data: e.data,
        significance: e.significance as TimelineEventSignificance | undefined,
      })),
      dto.features ?? {},
    );

    return {
      studentId: timeline.studentId,
      totalEvents: timeline.totalEvents,
      periodStart: timeline.periodStart.toISOString(),
      periodEnd: timeline.periodEnd.toISOString(),
      events: timeline.events.map((e) => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      })),
      eventBreakdown: timeline.eventBreakdown as Record<string, number>,
    };
  }
}
