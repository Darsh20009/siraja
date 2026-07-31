import { Injectable, BadRequestException } from '@nestjs/common';
import { NativeAiEngineService } from '../services/native-ai-engine.service';
import type { ClassifyMistakeResponseDto, BatchClassifyMistakesResponseDto } from '../dtos/classify-mistake.dto';

/**
 * ClassifyMistakeUseCase — classifies one or many recitation mistakes
 * and detects systematic patterns across a batch.
 *
 * Delegates to MistakeClassificationEngine for all computation.
 * No database access is required.
 */
@Injectable()
export class ClassifyMistakeUseCase {
  constructor(private readonly engines: NativeAiEngineService) {}

  /**
   * Classify a single raw/expected pair.
   *
   * @throws BadRequestException when raw and expected are identical after
   *   normalization (nothing to classify).
   */
  classifyOne(raw: string, expected: string, wordIndex?: number): ClassifyMistakeResponseDto {
    try {
      const mistake = this.engines.mistakeClassifier.classify(raw, expected, wordIndex);
      return { mistake };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(message);
    }
  }

  /**
   * Classify a batch of pairs and detect systematic patterns.
   */
  classifyBatch(
    pairs: Array<{ raw: string; expected: string; wordIndex?: number }>,
  ): BatchClassifyMistakesResponseDto {
    const mistakes = this.engines.mistakeClassifier.classifyBatch(pairs);
    const patterns = this.engines.mistakeClassifier.detectPatterns(mistakes);

    return {
      mistakes,
      patterns,
      total: mistakes.length,
      systematicCount: patterns.filter((p) => p.isSystematic).length,
    };
  }
}
