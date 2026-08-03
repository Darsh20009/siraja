import { Module } from '@nestjs/common';
import { NativeAiModule } from '../native-ai/native-ai.module';

// ── Domain engines ─────────────────────────────────────────────────────────
// (Pure classes — instantiated inside services, not registered as providers)

// ── Application services ──────────────────────────────────────────────────
import { AiRuntimeService } from './application/services/ai-runtime.service';
import { AiContextManagerService } from './application/services/ai-context-manager.service';
import { AiSessionManagerService } from './application/services/ai-session-manager.service';
import { AiCacheService } from './application/services/ai-cache.service';
import { AiEventBusService } from './application/services/ai-event-bus.service';
import { AiMetricsService } from './application/services/ai-metrics.service';
import { FeatureStoreService } from './application/services/feature-store.service';

// ── Orchestrators ─────────────────────────────────────────────────────────
import { AiPipelineService } from './application/orchestrators/ai-pipeline.service';
import { AiOrchestratorService } from './application/orchestrators/ai-orchestrator.service';
import { RecommendationPipelineService } from './application/orchestrators/recommendation-pipeline.service';

// ── Planners ──────────────────────────────────────────────────────────────
import { LearningPlannerService } from './application/planners/learning-planner.service';
import { RevisionSchedulerService } from './application/planners/revision-scheduler.service';

// ── Providers ─────────────────────────────────────────────────────────────
import { StudentTimelineProvider } from './application/providers/student-timeline.provider';
import { ParentReportProvider } from './application/providers/parent-report.provider';
import { SheikhDashboardProvider } from './application/providers/sheikh-dashboard.provider';

// ── Use cases ─────────────────────────────────────────────────────────────
import { RunStudentAnalysisUseCase } from './application/use-cases/run-student-analysis.use-case';
import { GenerateParentReportUseCase } from './application/use-cases/generate-parent-report.use-case';
import { GetSheikhDashboardUseCase } from './application/use-cases/get-sheikh-dashboard.use-case';
import { GetStudentTimelineUseCase } from './application/use-cases/get-student-timeline.use-case';
import { ComputeRiskUseCase } from './application/use-cases/compute-risk.use-case';

// ── Controller ────────────────────────────────────────────────────────────
import { NativeAiRuntimeController } from './infrastructure/controllers/native-ai-runtime.controller';

const SERVICES = [
  AiRuntimeService,
  AiContextManagerService,
  AiSessionManagerService,
  AiCacheService,
  AiEventBusService,
  AiMetricsService,
  FeatureStoreService,
];

const ORCHESTRATORS = [
  AiPipelineService,
  AiOrchestratorService,
  RecommendationPipelineService,
];

const PLANNERS = [LearningPlannerService, RevisionSchedulerService];

const PROVIDERS = [
  StudentTimelineProvider,
  ParentReportProvider,
  SheikhDashboardProvider,
];

const USE_CASES = [
  RunStudentAnalysisUseCase,
  GenerateParentReportUseCase,
  GetSheikhDashboardUseCase,
  GetStudentTimelineUseCase,
  ComputeRiskUseCase,
];

/**
 * NativeAiRuntimeModule — Phase 13D: Production AI orchestration runtime.
 *
 * Wires the 20-component Native AI Runtime:
 *   AI Runtime · AI Orchestrator · AI Pipeline · AI Context Manager ·
 *   AI Session Manager · AI Cache Layer · Decision Engine · Rule Engine ·
 *   Explainability Engine · Recommendation Pipeline · Personalized Learning Planner ·
 *   Adaptive Revision Scheduler · Predictive Risk Engine · Student AI Timeline ·
 *   Parent AI Report Generator · Sheikh AI Dashboard Provider · Knowledge Graph ·
 *   Internal Feature Store · AI Event Bus · AI Metrics & Telemetry
 *
 * Imports NativeAiModule for access to all 14 deterministic NLP engines.
 * Zero external AI dependencies — all computation is in-process.
 */
@Module({
  imports: [NativeAiModule],
  controllers: [NativeAiRuntimeController],
  providers: [...SERVICES, ...ORCHESTRATORS, ...PLANNERS, ...PROVIDERS, ...USE_CASES],
  exports: [
    // Services useful to other modules (e.g. IntelligenceModule)
    AiRuntimeService,
    AiCacheService,
    AiMetricsService,
    AiEventBusService,
    FeatureStoreService,
    RecommendationPipelineService,
    LearningPlannerService,
    RevisionSchedulerService,
  ],
})
export class NativeAiRuntimeModule {}
