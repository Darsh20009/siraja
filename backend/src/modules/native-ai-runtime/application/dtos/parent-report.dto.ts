import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SmSessionDto } from './student-analysis.dto';

export class TimelineEventDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsDateString()
  timestamp: string;

  @ApiProperty()
  data: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  significance?: string;
}

export class GenerateParentReportRequestDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty()
  @IsString()
  studentName: string;

  @ApiProperty({ description: 'ISO date string for report period start' })
  @IsDateString()
  periodFrom: string;

  @ApiProperty({ description: 'ISO date string for report period end' })
  @IsDateString()
  periodTo: string;

  @ApiProperty({ type: [Number] })
  @IsArray() @IsNumber({}, { each: true })
  weeklyVelocities: number[];

  @ApiProperty({ type: [SmSessionDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => SmSessionDto)
  sessions: SmSessionDto[];

  @ApiProperty()
  @IsInt() @Min(1)
  targetAyahs: number;

  @ApiProperty()
  @IsInt() @Min(0)
  currentProgress: number;

  @ApiProperty()
  @IsNumber() @Min(0) @Max(100)
  burdenScore: number;

  @ApiProperty()
  @IsNumber() @Min(0) @Max(100)
  tajweedScore: number;

  @ApiProperty()
  @IsInt() @Min(0)
  daysSinceLastSession: number;

  @ApiProperty()
  @IsInt() @Min(1) @Max(5)
  currentDifficultyLevel: number;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0)
  streakDays?: number;

  @ApiPropertyOptional({ type: [TimelineEventDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TimelineEventDto)
  timelineEvents?: TimelineEventDto[];
}

export class GenerateParentReportResponseDto {
  @ApiProperty()
  studentId: string;

  @ApiProperty()
  studentName: string;

  @ApiProperty()
  generatedAt: string;

  @ApiProperty()
  period: { from: string; to: string };

  @ApiProperty()
  summary: string;

  @ApiProperty()
  progressSnapshot: object;

  @ApiProperty()
  riskAssessment: object;

  @ApiProperty({ type: [Object] })
  topRecommendations: object[];

  @ApiProperty()
  forecast: object;

  @ApiProperty()
  timeline: object;
}
