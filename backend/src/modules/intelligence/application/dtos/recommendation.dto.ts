import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RecommendationTargetDto {
  @ApiProperty()
  unit: string;
  @ApiProperty()
  value: number;
  @ApiPropertyOptional()
  period?: string;
}

export class IntelligenceRecommendationDto {
  @ApiProperty({ enum: ['memorization', 'revision', 'attendance', 'schedule', 'tajweed', 'motivation'] })
  type: string;

  @ApiProperty({ enum: ['high', 'medium', 'low'] })
  priority: string;

  @ApiProperty({ description: 'Short, human-readable recommendation title' })
  title: string;

  @ApiProperty({ description: 'Specific, actionable description' })
  description: string;

  @ApiProperty({ description: 'Rule key that triggered this recommendation (for explainability)' })
  triggeredBy: string;

  @ApiProperty({ description: 'Whether this recommendation has a clear immediate action' })
  actionable: boolean;

  @ApiPropertyOptional({ type: RecommendationTargetDto, description: 'Optional quantitative target' })
  target?: RecommendationTargetDto;
}

export class StudentRecommendationsDto {
  @ApiProperty()
  studentId: string;

  @ApiProperty({ description: 'ISO date-time when recommendations were generated' })
  generatedAt: string;

  @ApiProperty({ type: [IntelligenceRecommendationDto] })
  recommendations: IntelligenceRecommendationDto[];

  @ApiProperty({ description: 'Total number of recommendations' })
  total: number;

  @ApiProperty({ description: 'Number of high-priority recommendations' })
  highPriorityCount: number;
}
