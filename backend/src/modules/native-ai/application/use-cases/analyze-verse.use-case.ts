import { Injectable } from '@nestjs/common';
import { NativeAiEngineService } from '../services/native-ai-engine.service';
import type { AnalyzeVerseResponseDto, VerseAnalysisDto } from '../dtos/analyze-verse.dto';
import type { TajweedSummaryDto } from '../dtos/analyze-text.dto';

/**
 * AnalyzeVerseUseCase — performs a full structural analysis of a single ayah,
 * extending text analysis with verse-level metrics (rhyme, difficulty, flags).
 *
 * No database access; entirely deterministic in-process computation.
 */
@Injectable()
export class AnalyzeVerseUseCase {
  constructor(private readonly engines: NativeAiEngineService) {}

  execute(text: string, surahNumber: number, ayahNumber: number): AnalyzeVerseResponseDto {
    const result = this.engines.orchestrator.analyzeVerse(text, surahNumber, ayahNumber);

    const summary = result.tajweedSummary;
    const tajweedSummary: TajweedSummaryDto = {
      totalApplications: summary.totalApplications,
      complexityScore: summary.complexityScore,
      easyCount: summary.byDifficulty.easy,
      mediumCount: summary.byDifficulty.medium,
      hardCount: summary.byDifficulty.hard,
      dominantRule: summary.dominantRule,
    };

    const va = result.verseAnalysis;
    const verseAnalysis: VerseAnalysisDto = {
      surahNumber: va.surahNumber,
      ayahNumber: va.ayahNumber,
      arabicText: va.arabicText,
      wordCount: va.wordCount,
      letterCount: va.letterCount,
      uniqueWordCount: va.uniqueWordCount,
      words: va.words,
      tajweedComplexity: va.tajweedComplexity,
      difficulty: va.difficulty,
      rhymeEnding: va.rhymeEnding,
      mostDifficultWord: va.mostDifficultWord,
      hasQalqala: va.hasQalqala,
      hasMadd: va.hasMadd,
      hasGhunna: va.hasGhunna,
      hasShadda: va.hasShadda,
    };

    return {
      text: result.text,
      tokens: result.tokens,
      wordAnalyses: result.wordAnalyses,
      tajweedApplications: result.tajweedApplications,
      tajweedSummary,
      verseAnalysis,
      surahNumber: result.surahNumber,
      ayahNumber: result.ayahNumber,
    };
  }
}
