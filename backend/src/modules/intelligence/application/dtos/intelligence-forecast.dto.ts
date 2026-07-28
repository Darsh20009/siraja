import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IntelligenceForecastDto {
  @ApiProperty()
  studentId: string;

  @ApiProperty({ description: 'ISO date-time when the forecast was computed' })
  generatedAt: string;

  @ApiProperty({ description: 'Total ayahs memorized to date' })
  totalAyahsMemorized: number;

  @ApiProperty({ description: 'Remaining ayahs until full Quran completion' })
  remainingAyahs: number;

  @ApiProperty({ description: 'Memorization progress percentage', minimum: 0, maximum: 100 })
  memorizationPercentage: number;

  @ApiPropertyOptional({ description: 'Estimated days to completion at current raw pace', nullable: true })
  estimatedDaysRemaining: number | null;

  @ApiPropertyOptional({ description: 'Estimated completion date (ISO date string) at current pace', nullable: true })
  estimatedCompletionDate: string | null;

  @ApiPropertyOptional({ description: 'Adjusted days remaining accounting for revision burden', nullable: true })
  adjustedDaysRemaining: number | null;

  @ApiPropertyOptional({ description: 'Adjusted completion date accounting for revision burden', nullable: true })
  adjustedCompletionDate: string | null;

  @ApiProperty({ description: 'Revision burden score (0=no backlog, 100=severe backlog)', minimum: 0, maximum: 100 })
  revisionBurdenScore: number;

  @ApiProperty({ description: 'Number of ayahs with overdue SM-2 review' })
  overdueRevisionCount: number;

  @ApiProperty({ description: 'Weekly ayahs to revise to clear backlog within 30 days' })
  weeklyRevisionNeededToClearBacklog: number;

  @ApiProperty({ enum: ['on-track', 'at-risk', 'behind'] })
  completionRisk: string;

  @ApiProperty({ enum: ['excellent', 'good', 'moderate', 'slow', 'inactive'] })
  paceLabel: string;

  @ApiProperty({ description: 'Consistency score (0–100)', minimum: 0, maximum: 100 })
  consistencyScore: number;

  @ApiProperty({ description: 'Active memorization days in the last 30 days' })
  activeDaysLast30: number;
}
