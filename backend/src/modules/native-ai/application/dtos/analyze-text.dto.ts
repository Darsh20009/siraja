import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

// ── Request ───────────────────────────────────────────────────────────────────

/**
 * AnalyzeTextRequestDto — payload for POST /native-ai/analyze/text.
 */
export class AnalyzeTextRequestDto {
  @ApiProperty({
    description: 'Arabic text to analyze (with or without diacritics).',
    example: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;
}

// ── Nested response shapes ─────────────────────────────────────────────────────

export class MorphemeBreakdownDto {
  @ApiPropertyOptional({ description: 'Detected prefix clitic (e.g. "ال", "بِ").' })
  prefix?: string;

  @ApiProperty({ description: 'Core stem after prefix/suffix stripping.' })
  stem: string;

  @ApiPropertyOptional({ description: 'Detected suffix clitic (e.g. "هم", "ون").' })
  suffix?: string;
}

export class QuranTokenDto {
  @ApiProperty({ description: 'Original token text as it appears in the source.' })
  text: string;

  @ApiProperty({ description: 'Diacritics-stripped, alef/ya-unified form.' })
  normalized: string;

  @ApiProperty({ enum: ['word', 'particle', 'number', 'punctuation'], description: 'Token type.' })
  type: string;

  @ApiProperty({ description: 'Zero-based position of this token in the text.' })
  position: number;

  @ApiProperty({ type: MorphemeBreakdownDto })
  morphemes: MorphemeBreakdownDto;

  @ApiProperty({ description: 'Count of Arabic letter characters (excluding diacritics).' })
  letterCount: number;

  @ApiPropertyOptional({ description: 'Surah number if tokenized via tokenizeAyah().' })
  surahNumber?: number;

  @ApiPropertyOptional({ description: 'Ayah number if tokenized via tokenizeAyah().' })
  ayahNumber?: number;

  @ApiPropertyOptional({ description: 'Word index within the ayah.' })
  wordIndex?: number;
}

export class WordAnalysisDto {
  @ApiProperty({ description: 'Original word text.' })
  word: string;

  @ApiProperty({ description: 'Search-normalized form.' })
  normalized: string;

  @ApiPropertyOptional({ description: 'Extracted trilateral/quadrilateral root.' })
  root?: string;

  @ApiProperty({ description: 'Number of Arabic letter characters.' })
  letterCount: number;

  @ApiProperty({ description: 'Estimated syllable count from diacritic structure.' })
  syllableEstimate: number;

  @ApiProperty({ type: MorphemeBreakdownDto })
  morphemes: MorphemeBreakdownDto;

  @ApiProperty({ description: 'Tajweed complexity score 0–100 (averaged per letter).' })
  tajweedComplexity: number;

  @ApiProperty({ description: 'Learner difficulty 1–5.' })
  difficulty: number;

  @ApiProperty({ description: 'Word contains a qalqala letter.' })
  hasQalqala: boolean;

  @ApiProperty({ description: 'Word contains a madd (long vowel).' })
  hasMadd: boolean;

  @ApiProperty({ description: 'Word contains noon/meem + shadda (ghunna).' })
  hasGhunna: boolean;

  @ApiProperty({ description: 'Word contains a shadda.' })
  hasShadda: boolean;

  @ApiProperty({ description: 'Word contains a hamza.' })
  hasHamza: boolean;
}

export class TajweedApplicationDto {
  @ApiProperty({ description: 'Tajweed rule type identifier.' })
  rule: string;

  @ApiProperty({ description: 'Rule category (noon_rules, meem_rules, madd, etc.).' })
  category: string;

  @ApiProperty({ description: 'Zero-based word index where the rule applies.' })
  wordIndex: number;

  @ApiPropertyOptional({ description: 'Zero-based letter index within the word.' })
  letterIndex?: number;

  @ApiProperty({ description: 'The specific text fragment that triggered the rule.' })
  triggerText: string;

  @ApiPropertyOptional({ description: 'Required beat/count value for this rule.' })
  expectedCounts?: number;

  @ApiProperty({ enum: ['easy', 'medium', 'hard'], description: 'Application difficulty.' })
  difficulty: string;

  @ApiProperty({ description: 'Human-readable explanation of the rule application.' })
  description: string;
}

export class TajweedSummaryDto {
  @ApiProperty({ description: 'Total number of tajweed rule applications detected.' })
  totalApplications: number;

  @ApiProperty({ description: 'Tajweed complexity score 0–100.' })
  complexityScore: number;

  @ApiProperty({ description: 'Easy application count.' })
  easyCount: number;

  @ApiProperty({ description: 'Medium application count.' })
  mediumCount: number;

  @ApiProperty({ description: 'Hard application count.' })
  hardCount: number;

  @ApiPropertyOptional({ description: 'Most frequently occurring rule type.' })
  dominantRule?: string;
}

// ── Response ──────────────────────────────────────────────────────────────────

/**
 * AnalyzeTextResponseDto — full text analysis result.
 */
export class AnalyzeTextResponseDto {
  @ApiProperty({ description: 'The original input text.' })
  text: string;

  @ApiProperty({ type: [QuranTokenDto], description: 'Tokenized representation.' })
  tokens: QuranTokenDto[];

  @ApiProperty({ type: [WordAnalysisDto], description: 'Per-word linguistic analysis.' })
  wordAnalyses: WordAnalysisDto[];

  @ApiProperty({ type: [TajweedApplicationDto], description: 'Tajweed rule applications detected.' })
  tajweedApplications: TajweedApplicationDto[];

  @ApiProperty({ type: TajweedSummaryDto, description: 'Aggregate tajweed statistics.' })
  tajweedSummary: TajweedSummaryDto;
}
