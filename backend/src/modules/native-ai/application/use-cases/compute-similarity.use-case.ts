import { Injectable } from '@nestjs/common';
import { NativeAiEngineService } from '../services/native-ai-engine.service';
import type { ComputeSimilarityResponseDto } from '../dtos/compute-similarity.dto';

/**
 * ComputeSimilarityUseCase — computes multi-dimensional similarity between
 * two Arabic text segments to help identify easily-confused ayahs.
 *
 * Delegates to SimilarityEngine for all computation.
 * No database access is required.
 */
@Injectable()
export class ComputeSimilarityUseCase {
  constructor(private readonly engines: NativeAiEngineService) {}

  execute(textA: string, textB: string): ComputeSimilarityResponseDto {
    return this.engines.similarity.compute(textA, textB);
  }
}
