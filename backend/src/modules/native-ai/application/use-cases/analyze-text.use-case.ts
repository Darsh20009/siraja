import { Injectable } from '@nestjs/common';
import { NativeAiEngineService } from '../services/native-ai-engine.service';
import type { AnalyzeTextResponseDto, TajweedSummaryDto } from '../dtos/analyze-text.dto';

/**
 * AnalyzeTextUseCase — tokenizes, analyses, and detects tajweed rules for
 * arbitrary Arabic text.
 *
 * No database access; all computation is entirely in-process and
 * deterministic.  A single call triggers four engine passes:
 *   1. Tokenization  (TokenizerEngine)
 *   2. Per-word analysis  (WordAnalyzerEngine)
 *   3. Tajweed detection  (TajweedRuleEngine)
 *   4. Tajweed summarization
 */
@Injectable()
export class AnalyzeTextUseCase {
  constructor(private readonly engines: NativeAiEngineService) {}

  execute(text: string): AnalyzeTextResponseDto {
    const result = this.engines.orchestrator.analyzeText(text);

    const summary = result.tajweedSummary;
    const tajweedSummary: TajweedSummaryDto = {
      totalApplications: summary.totalApplications,
      complexityScore: summary.complexityScore,
      easyCount: summary.byDifficulty.easy,
      mediumCount: summary.byDifficulty.medium,
      hardCount: summary.byDifficulty.hard,
      dominantRule: summary.dominantRule,
    };

    return {
      text: result.text,
      tokens: result.tokens,
      wordAnalyses: result.wordAnalyses,
      tajweedApplications: result.tajweedApplications,
      tajweedSummary,
    };
  }
}
