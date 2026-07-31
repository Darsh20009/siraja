import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

// ── Request ───────────────────────────────────────────────────────────────────

/**
 * ComputeSimilarityRequestDto — payload for POST /native-ai/similarity.
 */
export class ComputeSimilarityRequestDto {
  @ApiProperty({
    description: 'First Arabic text segment (with or without diacritics).',
    example: 'الرَّحْمَٰنِ الرَّحِيمِ',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  textA: string;

  @ApiProperty({
    description: 'Second Arabic text segment to compare against.',
    example: 'الرَّحِيمِ الرَّحْمَٰنِ',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  textB: string;
}

// ── Nested shapes ─────────────────────────────────────────────────────────────

export class ConfusablePairDto {
  @ApiProperty({ description: 'Word from textA.' }) wordA: string;
  @ApiProperty({ description: 'Close word from textB.' }) wordB: string;
  @ApiProperty({ description: 'Normalised edit distance 0–1 (0 = identical).' }) normalizedDistance: number;
}

// ── Response ──────────────────────────────────────────────────────────────────

/**
 * ComputeSimilarityResponseDto — multi-dimensional similarity result.
 */
export class ComputeSimilarityResponseDto {
  @ApiProperty() textA: string;
  @ApiProperty() textB: string;

  @ApiProperty({ description: 'Jaccard vocabulary overlap 0–1.' })
  lexicalSimilarity: number;

  @ApiProperty({ description: 'Phonological resemblance 0–1 (letter-sequence edit distance).' })
  phonologicalSimilarity: number;

  @ApiProperty({ description: 'Structural similarity based on length and word count 0–1.' })
  structuralSimilarity: number;

  @ApiProperty({ description: 'Weighted composite: lexical×0.45 + phonological×0.35 + structural×0.20.' })
  compositeSimilarity: number;

  @ApiProperty({ type: [String], description: 'Words shared by both texts (normalised).' })
  sharedWords: string[];

  @ApiProperty({ type: [ConfusablePairDto], description: 'Word pairs that might be confused during recitation.' })
  confusablePairs: ConfusablePairDto[];
}
