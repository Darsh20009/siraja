import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SmSessionDto {
  @ApiProperty({ description: 'SM-2 quality grade 0–5', minimum: 0, maximum: 5 })
  @IsInt() @Min(0) @Max(5)
  grade: number;

  @ApiPropertyOptional({ description: 'Current ease factor (default 2.5)' })
  @IsOptional() @IsNumber()
  easeFactor?: number;

  @ApiPropertyOptional({ description: 'Current interval in days' })
  @IsOptional() @IsInt()
  interval?: number;

  @ApiPropertyOptional({ description: 'Repetition count' })
  @IsOptional() @IsInt()
  repetitions?: number;
}

export class RunStudentAnalysisRequestDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty({ type: [Number], description: 'Weekly ayah counts over last N weeks' })
  @IsArray() @IsNumber({}, { each: true })
  weeklyVelocities: number[];

  @ApiProperty({ type: [SmSessionDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => SmSessionDto)
  sessions: SmSessionDto[];

  @ApiProperty({ description: 'Total ayahs in memorization goal' })
  @IsInt() @Min(1)
  targetAyahs: number;

  @ApiProperty({ description: 'Ayahs memorized so far' })
  @IsInt() @Min(0)
  currentProgress: number;

  @ApiProperty({ description: 'Review burden score 0–100' })
  @IsNumber() @Min(0) @Max(100)
  burdenScore: number;

  @ApiProperty({ description: 'Tajweed proficiency score 0–100' })
  @IsNumber() @Min(0) @Max(100)
  tajweedScore: number;

  @ApiProperty({ description: 'Days since last session' })
  @IsInt() @Min(0)
  daysSinceLastSession: number;

  @ApiProperty({ description: 'Current difficulty level 1–5' })
  @IsInt() @Min(1) @Max(5)
  currentDifficultyLevel: number;

  @ApiPropertyOptional({ type: [String], description: 'Weak tajweed rule types' })
  @IsOptional() @IsArray() @IsString({ each: true })
  tajweedWeaknesses?: string[];
}

export class RunStudentAnalysisResponseDto {
  @ApiProperty()
  studentId: string;

  @ApiProperty()
  riskScore: number;

  @ApiProperty()
  riskLevel: string;

  @ApiProperty({ type: [Object] })
  riskFactors: object[];

  @ApiProperty({ type: [String] })
  riskRecommendations: string[];

  @ApiProperty({ type: [Object] })
  recommendations: object[];

  @ApiProperty()
  adaptivePlan: object;

  @ApiProperty()
  forecast: object;

  @ApiProperty()
  velocity: number;

  @ApiProperty()
  isOnTrack: boolean;

  @ApiProperty()
  generatedAt: string;
}
