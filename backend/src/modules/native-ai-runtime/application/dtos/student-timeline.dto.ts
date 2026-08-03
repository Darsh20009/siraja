import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RawTimelineEventDto {
  @ApiProperty({
    enum: [
      'memorization_session', 'review_session', 'mistake_detected',
      'milestone_reached', 'risk_flag_raised', 'recommendation_issued',
      'adaptive_plan_generated', 'absence_detected', 'tajweed_improvement',
      'tajweed_regression',
    ],
  })
  @IsString()
  type: string;

  @ApiProperty({ description: 'ISO timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty()
  data: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'] })
  @IsOptional() @IsString()
  significance?: string;
}

export class GetStudentTimelineRequestDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty({ type: [RawTimelineEventDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => RawTimelineEventDto)
  events: RawTimelineEventDto[];

  @ApiPropertyOptional({ description: 'Feature values to drive AI annotations' })
  @IsOptional()
  features?: Record<string, number>;
}

export class GetStudentTimelineResponseDto {
  @ApiProperty()
  studentId: string;

  @ApiProperty()
  totalEvents: number;

  @ApiProperty()
  periodStart: string;

  @ApiProperty()
  periodEnd: string;

  @ApiProperty({ type: [Object] })
  events: object[];

  @ApiProperty()
  eventBreakdown: Record<string, number>;
}
