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
import { SmSessionDto } from './student-analysis.dto';

export class StudentInputDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty()
  @IsString()
  displayName: string;

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
}

export class GetSheikhDashboardRequestDto {
  @ApiProperty()
  @IsString()
  sheikhId: string;

  @ApiProperty({ type: [StudentInputDto], description: 'Students in this sheikh's circle (max 100)' })
  @IsArray() @ValidateNested({ each: true }) @Type(() => StudentInputDto)
  students: StudentInputDto[];
}

export class GetSheikhDashboardResponseDto {
  @ApiProperty()
  sheikhId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  generatedAt: string;

  @ApiProperty({ type: [Object] })
  studentSummaries: object[];

  @ApiProperty()
  groupStats: object;

  @ApiProperty({ type: [Object] })
  atRiskStudents: object[];

  @ApiProperty({ type: [Object] })
  topRecommendations: object[];
}

export class GetRevisionScheduleRequestDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty({ type: [SmSessionDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => SmSessionDto)
  sessions: SmSessionDto[];

  @ApiProperty({ type: [Object], description: 'Items to schedule: [{id, label, lastGrade?}]' })
  @IsArray()
  itemsToSchedule: Array<{ id: string; label: string; lastGrade?: number }>;
}

export class GetRevisionScheduleResponseDto {
  @ApiProperty()
  studentId: string;

  @ApiProperty()
  generatedAt: string;

  @ApiProperty({ type: [Object] })
  items: object[];

  @ApiProperty()
  totalDueThisWeek: number;

  @ApiProperty()
  totalDueNextWeek: number;

  @ApiProperty()
  pattern: object;
}

export class GetLearningPlanRequestDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty({ type: [Number] })
  @IsArray() @IsNumber({}, { each: true })
  weeklyVelocities: number[];

  @ApiProperty({ type: [SmSessionDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => SmSessionDto)
  sessions: SmSessionDto[];

  @ApiProperty()
  @IsNumber() @Min(0) @Max(100)
  burdenScore: number;

  @ApiProperty()
  @IsNumber() @Min(0) @Max(100)
  tajweedScore: number;

  @ApiProperty()
  @IsInt() @Min(1) @Max(5)
  currentDifficultyLevel: number;

  @ApiProperty()
  @IsInt() @Min(0)
  daysSinceLastSession: number;

  @ApiProperty()
  @IsInt() @Min(1)
  targetAyahs: number;

  @ApiProperty()
  @IsInt() @Min(0)
  currentProgress: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  tajweedWeaknesses?: string[];
}

export class GetLearningPlanResponseDto {
  @ApiProperty()
  studentId: string;

  @ApiProperty()
  adaptivePlan: object;

  @ApiProperty({ type: [Object] })
  recommendations: object[];

  @ApiProperty()
  velocity: number;

  @ApiProperty()
  isOnTrack: boolean;

  @ApiProperty()
  generatedAt: string;
}
