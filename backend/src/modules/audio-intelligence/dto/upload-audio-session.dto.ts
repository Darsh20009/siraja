import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { AudioFormat } from '../domain/entities/audio-session.entity';
import { AudioRules } from '../domain/rules/audio-rules';

const ACCEPTED_FORMATS = Object.keys(AudioRules.ACCEPTED_MIME_TYPES) as AudioFormat[];

export class UploadAudioSessionDto {
  @ApiProperty({
    description: 'Audio file format',
    enum: ACCEPTED_FORMATS,
    example: 'wav',
  })
  @IsString()
  @IsIn(ACCEPTED_FORMATS)
  format: AudioFormat;

  @ApiProperty({
    description: 'Surah number being recited (1–114)',
    minimum: 1,
    maximum: 114,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Max(114)
  surahNumber: number;

  @ApiProperty({
    description: 'Starting ayah number (inclusive)',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  fromAyah: number;

  @ApiProperty({
    description: 'Ending ayah number (inclusive)',
    minimum: 1,
    example: 7,
  })
  @IsInt()
  @Min(1)
  toAyah: number;

  @ApiProperty({
    description: 'Student profile ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  studentId: string;

  @ApiPropertyOptional({
    description: 'Memorization record ID to link this audio to',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsMongoId()
  memorizationRecordId?: string;
}
