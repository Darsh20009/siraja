import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntelligenceRecommendationDto } from './recommendation.dto';

class ChildSummaryDto {
  @ApiProperty()
  studentId: string;
  @ApiProperty({ minimum: 0, maximum: 100 })
  memorizationScore: number;
  @ApiProperty({ minimum: 0, maximum: 100 })
  revisionScore: number;
  @ApiProperty({ minimum: 0, maximum: 100 })
  attendanceScore: number;
  @ApiProperty({ minimum: 0, maximum: 100 })
  consistencyScore: number;
  @ApiProperty({ enum: ['low', 'medium', 'high'] })
  forgettingRisk: string;
  @ApiProperty()
  totalAyahsMemorized: number;
  @ApiProperty({ minimum: 0, maximum: 100 })
  memorizationPercentage: number;
  @ApiProperty()
  overdueRevisionCount: number;
  @ApiProperty()
  openMistakes: number;
  @ApiProperty({ type: [IntelligenceRecommendationDto] })
  recommendations: IntelligenceRecommendationDto[];
  @ApiPropertyOptional({ nullable: true })
  lastMemorizationDate: string | null;
  @ApiPropertyOptional({ nullable: true })
  lastRevisionDate: string | null;
  @ApiProperty()
  activeDaysLast30: number;
}

class ParentInsightAggregateDto {
  @ApiProperty()
  totalChildren: number;
  @ApiProperty()
  averageMemorizationScore: number;
  @ApiProperty()
  averageAttendanceScore: number;
  @ApiProperty()
  totalOpenMistakes: number;
  @ApiProperty()
  childrenWithHighForgettingRisk: number;
  @ApiProperty()
  childrenWithLowAttendance: number;
}

export class ParentInsightDto {
  @ApiProperty()
  parentId: string;
  @ApiProperty({ description: 'ISO date-time when insights were generated' })
  generatedAt: string;
  @ApiProperty({ type: [ChildSummaryDto] })
  children: ChildSummaryDto[];
  @ApiProperty({ type: ParentInsightAggregateDto })
  aggregate: ParentInsightAggregateDto;
}
