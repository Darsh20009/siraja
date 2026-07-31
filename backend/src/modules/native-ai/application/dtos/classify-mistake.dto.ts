import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Request ───────────────────────────────────────────────────────────────────

/**
 * ClassifyMistakeRequestDto — classify a single recitation mistake.
 */
export class ClassifyMistakeRequestDto {
  @ApiProperty({
    description: 'The incorrect text produced by the student.',
    example: 'الرحيم',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  raw: string;

  @ApiProperty({
    description: 'The correct reference text.',
    example: 'الرَّحِيمِ',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  expected: string;

  @ApiPropertyOptional({
    description: 'Zero-based word position in the session (for pattern detection).',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  wordIndex?: number;
}

export class MistakePairDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  raw: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  expected: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  wordIndex?: number;
}

/**
 * BatchClassifyMistakesRequestDto — classify a batch of mistakes at once.
 */
export class BatchClassifyMistakesRequestDto {
  @ApiProperty({
    type: [MistakePairDto],
    description: 'Array of raw/expected pairs to classify (max 100).',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => MistakePairDto)
  mistakes: MistakePairDto[];
}

// ── Nested response shapes ─────────────────────────────────────────────────────

export class ClassifiedMistakeDto {
  @ApiProperty({ description: 'The incorrect text produced.' }) raw: string;
  @ApiProperty({ description: 'The expected correct text.' }) expected: string;
  @ApiProperty({ description: 'High-level mistake category.' }) category: string;
  @ApiProperty({ description: 'Fine-grained sub-category.' }) subcategory: string;
  @ApiProperty({ enum: ['critical', 'major', 'minor'] }) severity: string;
  @ApiPropertyOptional({ description: 'Tajweed rule violated, if applicable.' }) tajweedRule?: string;
  @ApiProperty({ description: 'True if this mistake type appears ≥3 times.' }) isSystematic: boolean;
  @ApiProperty({ description: 'Classification confidence 0–100.' }) confidenceScore: number;
  @ApiProperty({ description: 'Actionable guidance for the student.' }) remediation: string;
  @ApiProperty({ type: [String], description: 'Related rules to review.' }) relatedRules: string[];
}

export class MistakePatternDto {
  @ApiProperty() category: string;
  @ApiProperty() frequency: number;
  @ApiProperty() isSystematic: boolean;
  @ApiProperty({ type: [Number] }) affectedPositions: number[];
  @ApiProperty({ enum: ['improving', 'stable', 'worsening'] }) trend: string;
}

// ── Response ──────────────────────────────────────────────────────────────────

export class ClassifyMistakeResponseDto {
  @ApiProperty({ type: ClassifiedMistakeDto }) mistake: ClassifiedMistakeDto;
}

export class BatchClassifyMistakesResponseDto {
  @ApiProperty({ type: [ClassifiedMistakeDto] }) mistakes: ClassifiedMistakeDto[];
  @ApiProperty({ type: [MistakePatternDto], description: 'Systematic patterns detected across the batch.' }) patterns: MistakePatternDto[];
  @ApiProperty({ description: 'Total mistakes classified.' }) total: number;
  @ApiProperty({ description: 'Number of systematic (recurrent) mistakes.' }) systematicCount: number;
}
