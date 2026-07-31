import { Module } from '@nestjs/common';

// ── Application services ──────────────────────────────────────────────────────
import { NativeAiEngineService } from './application/services/native-ai-engine.service';

// ── Application use cases ─────────────────────────────────────────────────────
import { AnalyzeTextUseCase } from './application/use-cases/analyze-text.use-case';
import { AnalyzeVerseUseCase } from './application/use-cases/analyze-verse.use-case';
import { ClassifyMistakeUseCase } from './application/use-cases/classify-mistake.use-case';
import { ComputeSimilarityUseCase } from './application/use-cases/compute-similarity.use-case';
import { GetLearningInsightUseCase } from './application/use-cases/get-learning-insight.use-case';

// ── Infrastructure controllers ────────────────────────────────────────────────
import { NativeAiController } from './infrastructure/controllers/native-ai.controller';

/**
 * NativeAiModule — Phase 13C: Siraja Native AI Core.
 *
 * A fully self-contained, deterministic AI layer that runs entirely in-process
 * with zero external AI service dependencies.
 *
 * The module is stateless and read-only with respect to the database:
 * it never imports repositories, never writes to MongoDB, and never
 * enqueues background jobs.  All computation is synchronous in-process
 * TypeScript, making it safe to import from any other module without
 * creating circular dependencies.
 *
 * Architecture:
 *   domain/engines/    — 14 pure deterministic engine classes.
 *   domain/entities/   — Output type interfaces (no Mongoose schemas).
 *   domain/rules/      — Tunable threshold constants.
 *   application/services/ — NestJS-injectable engine façade (singleton).
 *   application/use-cases/ — Thin orchestrators: accept input → call engines → shape response.
 *   application/dtos/  — Validated request/response shapes with Swagger metadata.
 *   infrastructure/controllers/ — HTTP layer with RBAC and Swagger docs.
 *
 * RBAC:
 *   native_ai.read   — required for all analysis and insight endpoints
 *   native_ai.create — required for mistake classification endpoints
 */
@Module({
  controllers: [NativeAiController],
  providers: [
    // Singleton façade holding all 14 engine instances
    NativeAiEngineService,

    // Use cases
    AnalyzeTextUseCase,
    AnalyzeVerseUseCase,
    ClassifyMistakeUseCase,
    ComputeSimilarityUseCase,
    GetLearningInsightUseCase,
  ],
  exports: [
    NativeAiEngineService,
    AnalyzeTextUseCase,
    AnalyzeVerseUseCase,
    ClassifyMistakeUseCase,
    ComputeSimilarityUseCase,
    GetLearningInsightUseCase,
  ],
})
export class NativeAiModule {}
