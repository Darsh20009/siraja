import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StudentIntelligenceProfileDto {
  @ApiProperty({ description: 'Student profile ID' })
  studentId: string;

  @ApiProperty({ description: 'ISO date-time when this profile was computed' })
  generatedAt: string;

  // ── Core scores ────────────────────────────────────────────────────────────
  @ApiProperty({ description: 'Composite memorization performance score (0–100)', minimum: 0, maximum: 100 })
  memorizationScore: number;

  @ApiProperty({ description: 'Composite revision retention score (0–100)', minimum: 0, maximum: 100 })
  revisionScore: number;

  @ApiProperty({ description: 'Active-day frequency score over the past 30 days (0–100)', minimum: 0, maximum: 100 })
  consistencyScore: number;

  @ApiProperty({ description: 'Session attendance rate score (0–100)', minimum: 0, maximum: 100 })
  attendanceScore: number;

  // ── Diagnostic indices ─────────────────────────────────────────────────────
  @ApiProperty({ description: 'Difficulty index (0=easy, 100=very difficult)', minimum: 0, maximum: 100 })
  difficultyIndex: number;

  @ApiProperty({ enum: ['low', 'medium', 'high'], description: 'Risk that memorized content will be forgotten' })
  forgettingRisk: 'low' | 'medium' | 'high';

  // ── Temporal patterns ──────────────────────────────────────────────────────
  @ApiProperty({ enum: ['morning', 'afternoon', 'evening', 'unknown'] })
  bestMemorizationTime: string;

  @ApiProperty({ enum: ['morning', 'afternoon', 'evening', 'unknown'] })
  bestRevisionTime: string;

  // ── Velocity & retention ───────────────────────────────────────────────────
  @ApiProperty({ description: 'Average ayahs memorized per completed session' })
  learningSpeed: number;

  @ApiProperty({ description: 'Percentage of memorized ayahs with mastery score ≥ 60', minimum: 0, maximum: 100 })
  retentionRate: number;

  // ── Pace ───────────────────────────────────────────────────────────────────
  @ApiProperty({ description: 'Average ayahs memorized per active day (last 30 days)' })
  dailyPaceAyahs: number;

  @ApiProperty({ description: 'Projected weekly memorization at current pace' })
  weeklyPaceAyahs: number;

  @ApiProperty({ description: 'Number of active memorization days in the last 30 days' })
  activeDaysLast30: number;

  @ApiProperty({ description: 'Total ayahs memorized to date' })
  totalAyahsMemorized: number;

  @ApiProperty({ description: 'Memorization progress as a percentage of the full Quran', minimum: 0, maximum: 100 })
  memorizationPercentage: number;

  // ── Revision ───────────────────────────────────────────────────────────────
  @ApiProperty({ description: 'Number of ayahs with overdue SM-2 review' })
  overdueRevisionCount: number;

  @ApiProperty({ description: 'Revision burden score (0–100). Above 60 = heavy backlog', minimum: 0, maximum: 100 })
  revisionBurdenScore: number;

  // ── Mistakes ───────────────────────────────────────────────────────────────
  @ApiProperty({ description: 'Number of currently open (unresolved) mistakes' })
  totalOpenMistakes: number;

  @ApiPropertyOptional({ description: 'The most frequently occurring mistake type, or null if no mistakes', nullable: true })
  dominantMistakeType: string | null;

  @ApiProperty({ description: 'Percentage of recorded mistakes that have been resolved', minimum: 0, maximum: 100 })
  mistakeResolutionRate: number;
}
