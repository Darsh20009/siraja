import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, Max, MaxLength } from 'class-validator';
import { AnalyzeTextResponseDto, WordAnalysisDto } from './analyze-text.dto';

// ── Request ───────────────────────────────────────────────────────────────────

/**
 * AnalyzeVerseRequestDto — payload for POST /native-ai/analyze/verse.
 */
export class AnalyzeVerseRequestDto {
  @ApiProperty({
    description: 'Arabic text of the ayah (with or without diacritics).',
    example: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;

  @ApiProperty({ description: 'Surah number (1–114).', minimum: 1, maximum: 114, example: 1 })
  @IsInt()
  @Min(1)
  @Max(114)
  surahNumber: number;

  @ApiProperty({ description: 'Ayah number within the surah (1-based).', minimum: 1, example: 2 })
  @IsInt()
  @Min(1)
  ayahNumber: number;
}

// ── Nested response shapes ─────────────────────────────────────────────────────

export class VerseAnalysisDto {
  @ApiProperty() surahNumber: number;
  @ApiProperty() ayahNumber: number;
  @ApiProperty() arabicText: string;
  @ApiProperty() wordCount: number;
  @ApiProperty() letterCount: number;
  @ApiProperty() uniqueWordCount: number;
  @ApiProperty({ type: [WordAnalysisDto] }) words: WordAnalysisDto[];
  @ApiProperty({ description: 'Tajweed complexity score 0–100.' }) tajweedComplexity: number;
  @ApiProperty({ description: 'Verse difficulty 0–100.' }) difficulty: number;
  @ApiPropertyOptional({ description: 'Last 1–2 bare consonants identifying the rhyme ending.' }) rhymeEnding?: string;
  @ApiPropertyOptional({ description: 'Normalized form of the most difficult word.' }) mostDifficultWord?: string;
  @ApiProperty() hasQalqala: boolean;
  @ApiProperty() hasMadd: boolean;
  @ApiProperty() hasGhunna: boolean;
  @ApiProperty() hasShadda: boolean;
}

// ── Response ──────────────────────────────────────────────────────────────────

/**
 * AnalyzeVerseResponseDto — full verse-level analysis extending text analysis.
 */
export class AnalyzeVerseResponseDto extends AnalyzeTextResponseDto {
  @ApiProperty({ description: 'Structural verse analysis including rhyme and difficulty.' })
  verseAnalysis: VerseAnalysisDto;

  @ApiProperty() surahNumber: number;
  @ApiProperty() ayahNumber: number;
}
