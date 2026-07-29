import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AudioScoreBreakdownDto {
  @ApiProperty({ description: 'Word accuracy (0–100)', example: 85 })
  accuracyScore: number;

  @ApiProperty({ description: 'Fluency / pace score (0–100)', example: 78 })
  fluencyScore: number;

  @ApiProperty({ description: 'Tajweed adherence score (0–100)', example: 72 })
  tajweedScore: number;

  @ApiProperty({ description: 'Consistency across segments (0–100)', example: 80 })
  consistencyScore: number;

  @ApiProperty({ description: 'Mean ASR word confidence (0–100)', example: 74 })
  asrConfidenceScore: number;
}

export class AudioScoreDto {
  @ApiProperty({ example: 79 })
  compositeScore: number;

  @ApiProperty({ type: AudioScoreBreakdownDto })
  breakdown: AudioScoreBreakdownDto;

  @ApiProperty({ example: 140 })
  totalExpectedWords: number;

  @ApiProperty({ example: 119 })
  correctWords: number;

  @ApiProperty({ example: 3 })
  insertedWords: number;

  @ApiProperty({ example: 18 })
  deletedWords: number;

  @ApiProperty({ example: 7 })
  totalMistakes: number;

  @ApiProperty({ example: 0 })
  criticalMistakes: number;

  @ApiProperty({ example: 2 })
  majorMistakes: number;

  @ApiProperty({ example: 5 })
  minorMistakes: number;

  @ApiProperty({ example: 112 })
  wordsPerMinute: number;

  @ApiProperty({ example: 63.7 })
  speechDurationSeconds: number;

  @ApiProperty({
    enum: ['excellent', 'good', 'satisfactory', 'needs_improvement'],
    example: 'good',
  })
  tier: string;
}

export class AudioRecommendationDto {
  @ApiProperty({ example: 'tajweed_practice' })
  type: string;

  @ApiProperty({ enum: ['high', 'medium', 'low'], example: 'medium' })
  priority: string;

  @ApiProperty({ example: 'Practise Madd Tabii (natural elongation)' })
  title: string;

  @ApiProperty({ example: 'The madd_tabii rule was applied incorrectly…' })
  description: string;

  @ApiProperty({ example: 'audio.tajweed_rule.madd_tabii' })
  triggeredBy: string;

  @ApiProperty({ example: true })
  actionable: boolean;

  @ApiPropertyOptional({ example: { unit: 'counts', value: 2, period: 'per madd' } })
  target?: { unit: string; value: number; period?: string };

  @ApiPropertyOptional({ example: 'madd_tabii' })
  tajweedRule?: string;
}

export class AudioSessionSummaryDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  studentId: string;

  @ApiProperty({ example: 1 })
  surahNumber: number;

  @ApiProperty({ example: 1 })
  fromAyah: number;

  @ApiProperty({ example: 7 })
  toAyah: number;

  @ApiProperty({ enum: ['wav', 'mp3', 'ogg', 'webm', 'm4a', 'flac'], example: 'wav' })
  format: string;

  @ApiProperty({ example: 63.7 })
  durationSeconds: number;

  @ApiProperty({
    enum: ['pending', 'processing', 'completed', 'failed', 'no_asr'],
    example: 'completed',
  })
  status: string;

  @ApiPropertyOptional({ type: AudioScoreDto })
  score?: AudioScoreDto;

  @ApiProperty({ type: [AudioRecommendationDto] })
  recommendations: AudioRecommendationDto[];

  @ApiProperty({ example: 5 })
  totalSegments: number;

  @ApiProperty({ example: 7 })
  totalMistakes: number;

  @ApiProperty({ example: 0 })
  criticalMistakes: number;

  @ApiProperty({ example: 12 })
  tajweedObservationCount: number;

  @ApiPropertyOptional({ example: '2026-07-28T12:00:00.000Z' })
  processedAt?: string;

  @ApiProperty({ example: '2026-07-28T11:55:00.000Z' })
  createdAt: string;
}
