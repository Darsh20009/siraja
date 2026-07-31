import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';

import { AnalyzeTextUseCase } from '../../application/use-cases/analyze-text.use-case';
import { AnalyzeVerseUseCase } from '../../application/use-cases/analyze-verse.use-case';
import { ClassifyMistakeUseCase } from '../../application/use-cases/classify-mistake.use-case';
import { ComputeSimilarityUseCase } from '../../application/use-cases/compute-similarity.use-case';
import { GetLearningInsightUseCase } from '../../application/use-cases/get-learning-insight.use-case';

import { AnalyzeTextRequestDto, AnalyzeTextResponseDto } from '../../application/dtos/analyze-text.dto';
import { AnalyzeVerseRequestDto, AnalyzeVerseResponseDto } from '../../application/dtos/analyze-verse.dto';
import {
  ClassifyMistakeRequestDto,
  ClassifyMistakeResponseDto,
  BatchClassifyMistakesRequestDto,
  BatchClassifyMistakesResponseDto,
} from '../../application/dtos/classify-mistake.dto';
import { ComputeSimilarityRequestDto, ComputeSimilarityResponseDto } from '../../application/dtos/compute-similarity.dto';
import {
  GetLearningInsightRequestDto,
  GetLearningInsightResponseDto,
} from '../../application/dtos/learning-insight.dto';

/**
 * NativeAiController — Phase 13C: Siraja Native AI Core.
 *
 * All endpoints are fully deterministic and run entirely in-process.
 * No external AI service is ever called.
 *
 * Base path: /native-ai
 *
 * Endpoint groups:
 *   POST /native-ai/analyze/text    — tokenise + analyse arbitrary Arabic text
 *   POST /native-ai/analyze/verse   — full structural verse analysis
 *   POST /native-ai/mistakes/classify      — classify a single mistake
 *   POST /native-ai/mistakes/classify-batch — classify a session batch
 *   POST /native-ai/similarity      — multi-dimensional text similarity
 *   POST /native-ai/learning/insight — SM-2 pattern + forecast + plan + recommendations
 */
@ApiTags('Native AI')
@ApiBearerAuth()
@Controller('native-ai')
export class NativeAiController {
  constructor(
    private readonly analyzeText: AnalyzeTextUseCase,
    private readonly analyzeVerse: AnalyzeVerseUseCase,
    private readonly classifyMistake: ClassifyMistakeUseCase,
    private readonly computeSimilarity: ComputeSimilarityUseCase,
    private readonly getLearningInsight: GetLearningInsightUseCase,
  ) {}

  // ── Text analysis ─────────────────────────────────────────────────────────

  @Post('analyze/text')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NATIVE_AI.READ!)
  @ApiOperation({
    summary: 'Analyse Arabic text',
    description:
      'Tokenizes the input, performs per-word linguistic analysis, and detects ' +
      'all tajweed rule applications. Runs entirely in-process — zero external AI calls.',
  })
  @ApiBody({ type: AnalyzeTextRequestDto })
  @ApiOkResponse({ type: AnalyzeTextResponseDto, description: 'Full text analysis result.' })
  @ApiBadRequestResponse({ description: 'text is empty or exceeds 5 000 characters.' })
  analyzeTextEndpoint(@Body() dto: AnalyzeTextRequestDto): AnalyzeTextResponseDto {
    return this.analyzeText.execute(dto.text);
  }

  @Post('analyze/verse')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NATIVE_AI.READ!)
  @ApiOperation({
    summary: 'Analyse a Quranic verse',
    description:
      'Performs full structural analysis of a single ayah: tokenization, per-word ' +
      'analysis, tajweed detection, rhyme pattern, difficulty score, and tajweed flags. ' +
      'Runs entirely in-process — zero external AI calls.',
  })
  @ApiBody({ type: AnalyzeVerseRequestDto })
  @ApiOkResponse({ type: AnalyzeVerseResponseDto, description: 'Full verse analysis result.' })
  @ApiBadRequestResponse({ description: 'Invalid surah/ayah numbers or empty text.' })
  analyzeVerseEndpoint(@Body() dto: AnalyzeVerseRequestDto): AnalyzeVerseResponseDto {
    return this.analyzeVerse.execute(dto.text, dto.surahNumber, dto.ayahNumber);
  }

  // ── Mistake classification ────────────────────────────────────────────────

  @Post('mistakes/classify')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NATIVE_AI.CREATE!)
  @ApiOperation({
    summary: 'Classify a single recitation mistake',
    description:
      'Compares a student\'s raw output against the expected correct text and ' +
      'classifies the mistake by category, severity, and tajweed rule. ' +
      'Returns actionable remediation guidance. Deterministic — no external AI.',
  })
  @ApiBody({ type: ClassifyMistakeRequestDto })
  @ApiOkResponse({ type: ClassifyMistakeResponseDto, description: 'Classified mistake.' })
  @ApiBadRequestResponse({ description: 'raw and expected are identical (no mistake to classify).' })
  classifyMistakeEndpoint(@Body() dto: ClassifyMistakeRequestDto): ClassifyMistakeResponseDto {
    return this.classifyMistake.classifyOne(dto.raw, dto.expected, dto.wordIndex);
  }

  @Post('mistakes/classify-batch')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NATIVE_AI.CREATE!)
  @ApiOperation({
    summary: 'Classify a session batch of mistakes',
    description:
      'Classifies up to 100 raw/expected pairs from a single recitation session ' +
      'and returns systematic pattern detection across the batch. ' +
      'Deterministic — no external AI.',
  })
  @ApiBody({ type: BatchClassifyMistakesRequestDto })
  @ApiOkResponse({ type: BatchClassifyMistakesResponseDto, description: 'All classified mistakes plus patterns.' })
  classifyBatchEndpoint(@Body() dto: BatchClassifyMistakesRequestDto): BatchClassifyMistakesResponseDto {
    return this.classifyMistake.classifyBatch(dto.mistakes);
  }

  // ── Similarity ────────────────────────────────────────────────────────────

  @Post('similarity')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NATIVE_AI.READ!)
  @ApiOperation({
    summary: 'Compute Arabic text similarity',
    description:
      'Returns lexical (Jaccard), phonological (edit-distance), structural, and ' +
      'weighted composite similarity scores between two Arabic texts. ' +
      'Also identifies confusable word pairs that students might mix up. ' +
      'Deterministic — no external AI.',
  })
  @ApiBody({ type: ComputeSimilarityRequestDto })
  @ApiOkResponse({ type: ComputeSimilarityResponseDto, description: 'Multi-dimensional similarity result.' })
  similarityEndpoint(@Body() dto: ComputeSimilarityRequestDto): ComputeSimilarityResponseDto {
    return this.computeSimilarity.execute(dto.textA, dto.textB);
  }

  // ── Learning intelligence ─────────────────────────────────────────────────

  @Post('learning/insight')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NATIVE_AI.READ!)
  @ApiOperation({
    summary: 'Get personalised learning insight bundle',
    description:
      'Runs four local engines in sequence: SM-2 + Ebbinghaus memorization pattern, ' +
      'velocity-based completion forecast, rule-based recommendations, and an ' +
      'adaptive weekly study plan. All computation is deterministic and in-process — ' +
      'no external AI calls. Designed to be invoked with student session history ' +
      'fetched by the caller.',
  })
  @ApiBody({ type: GetLearningInsightRequestDto })
  @ApiOkResponse({ type: GetLearningInsightResponseDto, description: 'Learning insight bundle.' })
  learningInsightEndpoint(@Body() dto: GetLearningInsightRequestDto): GetLearningInsightResponseDto {
    return this.getLearningInsight.execute(dto);
  }
}
