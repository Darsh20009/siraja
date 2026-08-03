import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class ComputeRiskRequestDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty({
    description:
      'Pre-computed feature map. Accepted keys: velocity, burdenScore, tajweedScore, ' +
      'retentionRate, daysSinceLastSession, mistakeRate, difficultyLevel, engagementScore.',
  })
  @IsObject()
  features: Record<string, number>;
}

export class ComputeRiskResponseDto {
  @ApiProperty()
  studentId: string;

  @ApiProperty({ minimum: 0, maximum: 100 })
  riskScore: number;

  @ApiProperty({ enum: ['low', 'medium', 'high', 'critical'] })
  riskLevel: string;

  @ApiProperty({ type: [Object] })
  riskFactors: object[];

  @ApiProperty({ type: [String] })
  recommendations: string[];

  @ApiProperty()
  explanation: object;

  @ApiProperty()
  assessedAt: string;
}

export class GetRuntimeStatusResponseDto {
  @ApiProperty()
  status: string;

  @ApiProperty({ type: [String] })
  registeredPipelines: string[];

  @ApiProperty()
  startedAt: string;

  @ApiProperty()
  uptimeMs: number;
}

export class GetMetricsRequestDto {
  @ApiPropertyOptional({ description: 'Filter to a specific tenant; omit for global metrics' })
  @IsOptional() @IsString()
  tenantId?: string;
}

export class GetMetricsResponseDto {
  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  totalOperations: number;

  @ApiProperty()
  totalErrors: number;

  @ApiProperty()
  overallErrorRate: number;

  @ApiProperty()
  cache: object;

  @ApiProperty()
  operations: Record<string, object>;

  @ApiProperty()
  lastResetAt: string;
}

export class GetRecentEventsRequestDto {
  @ApiProperty({ description: 'Tenant to filter events for' })
  @IsString()
  tenantId: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50 })
  @IsOptional() @IsNumber() @Min(1) @Max(50)
  limit?: number;
}

export class GetRecentEventsResponseDto {
  @ApiProperty({ type: [Object] })
  events: object[];

  @ApiProperty()
  count: number;
}
