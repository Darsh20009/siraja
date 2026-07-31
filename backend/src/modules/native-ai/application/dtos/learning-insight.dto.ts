import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsEnum,
  ValidateNested,
  IsDate,
  ArrayMaxSize,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Request ───────────────────────────────────────────────────────────────────

export class SessionRecordDto {
  @ApiProperty({ description: 'SM-2 grade 0–5 for this session.', minimum: 0, maximum: 5 })
  @IsNumber()
  @Min(0)
  @Max(5)
  grade: number;

  @ApiProperty({ description: 'ISO-8601 date when the session occurred.' })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiPropertyOptional({ description: 'Session duration in minutes.', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;
}

/**
 * GetLearningInsightRequestDto — payload for POST /native-ai/learning/insight.
 *
 * The client supplies historical session data and memorization context;
 * the engine computes pattern, forecast, recommendations, and an adaptive plan.
 */
export class GetLearningInsightRequestDto {
  @ApiProperty({
    type: [SessionRecordDto],
    description: 'Chronological list of past study sessions (most recent last). Max 500.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(500)
  @Type(() => SessionRecordDto)
  sessions: SessionRecordDto[];

  @ApiProperty({ description: 'Total ayahs in the memorization goal (e.g. 6236 for full Quran).', minimum: 1 })
  @IsInt()
  @Min(1)
  targetAyahs: number;

  @ApiProperty({ description: 'Ayahs memorized to date.', minimum: 0 })
  @IsInt()
  @Min(0)
  currentProgress: number;

  @ApiProperty({
    type: [Number],
    description: 'Weekly velocity history in ayahs/week (oldest first, max 52).',
  })
  @IsArray()
  @ArrayMaxSize(52)
  @IsNumber({}, { each: true })
  weeklyVelocities: number[];

  @ApiProperty({ description: 'Review burden score 0–100 (0 = no burden, 100 = completely overloaded).', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  burdenScore: number;

  @ApiPropertyOptional({ description: 'Number of overdue review items.', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reviewOverdueCount?: number;

  @ApiPropertyOptional({ description: 'Overall tajweed score 0–100 from last session.', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tajweedScore?: number;

  @ApiPropertyOptional({ description: 'Current difficulty level 1–5.', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  currentDifficultyLevel?: number;

  @ApiPropertyOptional({ description: 'Days since the last study session.', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysSinceLastSession?: number;

  @ApiPropertyOptional({ type: [String], description: 'Tajweed rule types identified as weak areas.' })
  @IsOptional()
  @IsArray()
  tajweedWeaknesses?: string[];
}

// ── Nested response shapes ─────────────────────────────────────────────────────

export class MemorizationPatternDto {
  @ApiProperty() easeFactor: number;
  @ApiProperty() interval: number;
  @ApiProperty() repetitions: number;
  @ApiProperty({ description: 'Estimated retention probability 0–1.' }) retentionProbability: number;
  @ApiProperty({ description: 'Daily forgetting rate 0–1.' }) forgettingRate: number;
  @ApiProperty({ enum: ['morning', 'afternoon', 'evening', 'any'] }) optimalStudyTime: string;
  @ApiProperty({ description: 'Recommended session length in minutes.' }) recommendedSessionLength: number;
  @ApiProperty({ description: 'Proportion of time to spend on new material 0–1.' }) newToReviewRatio: number;
  @ApiProperty({ description: 'Estimated weekly memorization capacity in ayahs.' }) weeklyCapacity: number;
}

export class MilestoneDto {
  @ApiProperty() label: string;
  @ApiProperty() targetAyahs: number;
  @ApiProperty({ type: String, format: 'date-time' }) estimatedDate: string;
  @ApiProperty({ description: 'Probability 0–1 of reaching this milestone on time.' }) probability: number;
}

export class AiForecastDto {
  @ApiProperty() targetAyahs: number;
  @ApiProperty() currentProgress: number;
  @ApiProperty() remainingAyahs: number;
  @ApiProperty() velocity: number;
  @ApiProperty() projectedVelocity: number;
  @ApiProperty({ type: String, format: 'date-time' }) estimatedCompletionDate: string;
  @ApiProperty({ type: String, format: 'date-time' }) confidenceLow: string;
  @ApiProperty({ type: String, format: 'date-time' }) confidenceHigh: string;
  @ApiProperty() weeklyPaceRequired: number;
  @ApiProperty() isOnTrack: boolean;
  @ApiProperty({ description: 'Completion probability 0–1.' }) completionProbability: number;
  @ApiProperty({ type: [MilestoneDto] }) milestones: MilestoneDto[];
  @ApiProperty({ description: 'Review burden score 0–100.' }) burdenScore: number;
}

export class AiRecommendationDto {
  @ApiProperty() type: string;
  @ApiProperty({ enum: ['critical', 'high', 'medium', 'low'] }) priority: string;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty({ type: [String] }) actionItems: string[];
  @ApiProperty({ description: 'Estimated impact 0–100.' }) estimatedImpact: number;
  @ApiProperty({ description: 'Confidence score 0–100.' }) confidenceScore: number;
  @ApiProperty({ type: [String] }) triggeredBy: string[];
  @ApiProperty({ enum: ['tajweed', 'memorization', 'review', 'practice', 'general'] }) targetArea: string;
}

export class FocusAreaDto {
  @ApiProperty({ enum: ['tajweed', 'memorization', 'review', 'pronunciation'] }) area: string;
  @ApiProperty({ type: [String] }) specifics: string[];
  @ApiProperty({ description: 'Priority order (1 = most urgent).' }) priority: number;
  @ApiProperty({ description: 'Estimated weeks to proficiency.' }) estimatedImprovementWeeks: number;
}

export class DayScheduleDto {
  @ApiProperty({ description: '0=Sunday … 6=Saturday.' }) dayOfWeek: number;
  @ApiProperty() sessionMinutes: number;
  @ApiProperty() newAyahsTarget: number;
  @ApiProperty() reviewAyahsTarget: number;
  @ApiProperty() tajweedPractice: boolean;
  @ApiPropertyOptional({ enum: ['morning', 'afternoon', 'evening'] }) preferredTimeOfDay?: string;
}

export class AdaptivePlanDto {
  @ApiProperty({ description: 'Recommended weekly new-memorization pace (ayahs/week).' }) adjustedWeeklyPace: number;
  @ApiProperty({ description: 'Difficulty level 1–5.' }) difficultyLevel: number;
  @ApiProperty({ description: 'Proportion of time dedicated to review 0–1.' }) reviewEmphasis: number;
  @ApiProperty({ type: [DayScheduleDto] }) weeklySchedule: DayScheduleDto[];
  @ApiProperty({ type: [FocusAreaDto] }) focusAreas: FocusAreaDto[];
  @ApiProperty({ type: [String], description: 'Tajweed rules needing most attention.' }) tajweedFocusRules: string[];
  @ApiProperty() estimatedWeeksToGoal: number;
  @ApiProperty({ type: [String], description: 'Human-readable rationale for each adjustment.' }) rationale: string[];
}

// ── Response ──────────────────────────────────────────────────────────────────

/**
 * GetLearningInsightResponseDto — comprehensive learning intelligence bundle.
 */
export class GetLearningInsightResponseDto {
  @ApiProperty({ type: MemorizationPatternDto, description: 'SM-2 + Ebbinghaus memorization pattern.' })
  pattern: MemorizationPatternDto;

  @ApiProperty({ type: AiForecastDto, description: 'Completion forecast with confidence interval.' })
  forecast: AiForecastDto;

  @ApiProperty({ type: [AiRecommendationDto], description: 'Ranked actionable recommendations (max 8).' })
  recommendations: AiRecommendationDto[];

  @ApiProperty({ type: AdaptivePlanDto, description: 'Personalised weekly study plan.' })
  adaptivePlan: AdaptivePlanDto;

  @ApiProperty({ description: 'ISO-8601 timestamp when these insights were generated.' })
  generatedAt: string;
}
