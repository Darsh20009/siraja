import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Student audio profile ─────────────────────────────────────────────────────

export class StudentAudioProfileDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  studentId: string;

  @ApiProperty({ example: '2026-07-28T12:00:00.000Z' })
  generatedAt: string;

  @ApiProperty({ example: 12 })
  totalSessions: number;

  @ApiProperty({ example: 10 })
  completedSessions: number;

  @ApiProperty({ example: 76 })
  averageCompositeScore: number;

  @ApiProperty({ example: 89 })
  bestCompositeScore: number;

  @ApiProperty({ example: 82 })
  latestCompositeScore: number;

  @ApiProperty({ example: 80 })
  averageAccuracyScore: number;

  @ApiProperty({ example: 68 })
  averageTajweedScore: number;

  @ApiProperty({ example: 74 })
  averageFluencyScore: number;

  @ApiProperty({ example: 77 })
  averageConsistencyScore: number;

  @ApiProperty({ example: 45 })
  totalMistakes: number;

  @ApiProperty({ example: 2 })
  totalCriticalMistakes: number;

  @ApiPropertyOptional({
    enum: ['excellent', 'good', 'satisfactory', 'needs_improvement'],
    example: 'good',
  })
  latestTier: string | null;
}

// ── Parent insights ───────────────────────────────────────────────────────────

export class AudioChildSummaryDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  studentId: string;

  @ApiProperty({ example: 8 })
  totalSessions: number;

  @ApiProperty({ example: 7 })
  completedSessions: number;

  @ApiProperty({ example: 74 })
  averageCompositeScore: number;

  @ApiProperty({ example: 79 })
  latestCompositeScore: number;

  @ApiPropertyOptional({ enum: ['excellent', 'good', 'satisfactory', 'needs_improvement'] })
  latestTier: string | null;

  @ApiProperty({ example: 23 })
  totalMistakes: number;

  @ApiProperty({ example: 1 })
  criticalMistakes: number;

  @ApiProperty({ example: 65 })
  averageTajweedScore: number;

  @ApiPropertyOptional({ example: '2026-07-27T10:30:00.000Z' })
  lastSessionDate: string | null;
}

export class AudioParentInsightAggregateDto {
  @ApiProperty({ example: 15 })
  totalSessionsAllChildren: number;

  @ApiProperty({ example: 72 })
  averageCompositeScoreAllChildren: number;

  @ApiProperty({ example: 1 })
  childrenWithCriticalMistakes: number;
}

export class AudioParentInsightDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  parentId: string;

  @ApiProperty({ example: '2026-07-28T12:00:00.000Z' })
  generatedAt: string;

  @ApiProperty({ type: [AudioChildSummaryDto] })
  children: AudioChildSummaryDto[];

  @ApiProperty({ type: AudioParentInsightAggregateDto })
  aggregate: AudioParentInsightAggregateDto;
}

// ── Sheikh insights ───────────────────────────────────────────────────────────

export class AudioStudentBriefDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  studentId: string;

  @ApiProperty({ example: 6 })
  totalSessions: number;

  @ApiProperty({ example: 5 })
  completedSessions: number;

  @ApiProperty({ example: 68 })
  averageCompositeScore: number;

  @ApiProperty({ example: 72 })
  latestCompositeScore: number;

  @ApiPropertyOptional({ enum: ['excellent', 'good', 'satisfactory', 'needs_improvement'] })
  latestTier: string | null;

  @ApiProperty({ example: 18 })
  totalMistakes: number;

  @ApiProperty({ example: 2 })
  criticalMistakes: number;

  @ApiProperty({ example: 60 })
  averageTajweedScore: number;

  @ApiProperty({ example: 71 })
  averageAccuracyScore: number;

  @ApiProperty({ example: false })
  needsAttention: boolean;

  @ApiPropertyOptional({ example: '2026-07-26T09:15:00.000Z' })
  lastSessionDate: string | null;
}

export class AudioSheikhInsightAggregateDto {
  @ApiProperty({ example: 70 })
  averageCompositeScore: number;

  @ApiProperty({ example: 63 })
  averageTajweedScore: number;

  @ApiProperty({ example: 74 })
  averageAccuracyScore: number;

  @ApiProperty({ example: 120 })
  totalMistakes: number;

  @ApiProperty({ example: 8 })
  totalCriticalMistakes: number;

  @ApiProperty({ example: 7 })
  studentsWithRecentSessions: number;
}

export class AudioSheikhInsightDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  sheikhId: string;

  @ApiProperty({ example: '2026-07-28T12:00:00.000Z' })
  generatedAt: string;

  @ApiProperty({ example: 9 })
  totalStudents: number;

  @ApiProperty({ type: [AudioStudentBriefDto] })
  students: AudioStudentBriefDto[];

  @ApiProperty({ type: [String], example: ['id1', 'id2'] })
  needsAttention: string[];

  @ApiProperty({ type: [String], example: ['id3', 'id4', 'id5'] })
  topPerformers: string[];

  @ApiProperty({ type: AudioSheikhInsightAggregateDto })
  classAggregate: AudioSheikhInsightAggregateDto;
}
