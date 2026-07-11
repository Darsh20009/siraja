import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AiRequest,
  AiRequestSchema,
  AiReport,
  AiReportSchema,
  AiUsageLedger,
  AiUsageLedgerSchema,
} from '@database/mongoose/schemas';
import { AI_INSIGHT_REPOSITORY } from './domain/repositories/ai-insight.repository.interface';
import { AiInsightRepository } from './infrastructure/repositories/ai-insight.repository';
import { AI_USAGE_LEDGER_REPOSITORY } from './domain/repositories/ai-usage-ledger.repository.interface';
import { AiUsageLedgerRepository } from './infrastructure/repositories/ai-usage-ledger.repository';
import { AiCostGuardService } from './application/services/ai-cost-guard.service';
import { AiInsightOrchestratorService } from './application/services/ai-insight-orchestrator.service';
import { GenerateMistakeInsightUseCase } from './application/use-cases/generate-mistake-insight.use-case';
import { GenerateRevisionRecommendationUseCase } from './application/use-cases/generate-revision-recommendation.use-case';
import { GenerateMemorizationRecommendationUseCase } from './application/use-cases/generate-memorization-recommendation.use-case';
import { GenerateForecastExplanationUseCase } from './application/use-cases/generate-forecast-explanation.use-case';
import { GenerateSheikhAiReportUseCase } from './application/use-cases/generate-sheikh-ai-report.use-case';
import { GenerateParentAiReportUseCase } from './application/use-cases/generate-parent-ai-report.use-case';
import { ListAiInsightsUseCase } from './application/use-cases/list-ai-insights.use-case';
import { AcknowledgeAiInsightUseCase } from './application/use-cases/acknowledge-ai-insight.use-case';
import { AiController } from './infrastructure/controllers/ai.controller';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';
import { MistakesModule } from '@modules/mistakes/mistakes.module';
import { ReviewsModule } from '@modules/reviews/reviews.module';
import { ProgressModule } from '@modules/progress/progress.module';
import { AyahPerformanceModule } from '@modules/ayah-performance/ayah-performance.module';
import { ForecastModule } from '@modules/forecast/forecast.module';

/**
 * AI Module — Phase 11 (AI Learning Intelligence Architecture).
 *
 * Text/data-grounded AI features only (no audio/ASR — deferred to a
 * later phase per approved scope): Mistake Intelligence, Revision &
 * Memorization Recommendations, Completion Forecast Explanations, and
 * Sheikh/Parent AI Reports, plus a thin AI Insights history endpoint.
 *
 * Depends on `AiProviderModule` (global, provides `LLM_PROVIDER` —
 * `MoonshotProvider`) being registered in AppModule; does not import it
 * directly since @Global() modules are available everywhere once
 * registered once.
 *
 * Imports the existing Students/Sheikhs/Parents modules for ownership
 * checks, and Mistakes/Reviews/Progress/AyahPerformance/Forecast modules
 * to reuse their already-computed, deterministic aggregates as AI
 * grounding data — this module never touches their underlying Mongo
 * collections directly.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AiRequest.name, schema: AiRequestSchema },
      { name: AiReport.name, schema: AiReportSchema },
      { name: AiUsageLedger.name, schema: AiUsageLedgerSchema },
    ]),
    StudentsModule,
    SheikhsModule,
    ParentsModule,
    MistakesModule,
    ReviewsModule,
    ProgressModule,
    AyahPerformanceModule,
    ForecastModule,
  ],
  controllers: [AiController],
  providers: [
    { provide: AI_INSIGHT_REPOSITORY, useClass: AiInsightRepository },
    { provide: AI_USAGE_LEDGER_REPOSITORY, useClass: AiUsageLedgerRepository },
    AiCostGuardService,
    AiInsightOrchestratorService,
    GenerateMistakeInsightUseCase,
    GenerateRevisionRecommendationUseCase,
    GenerateMemorizationRecommendationUseCase,
    GenerateForecastExplanationUseCase,
    GenerateSheikhAiReportUseCase,
    GenerateParentAiReportUseCase,
    ListAiInsightsUseCase,
    AcknowledgeAiInsightUseCase,
  ],
})
export class AiModule {}
