import { Module } from '@nestjs/common';

// ── Domain consumers ──────────────────────────────────────────────────────────
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';
import { ProgressModule } from '@modules/progress/progress.module';
import { MemorizationModule } from '@modules/memorization/memorization.module';
import { ReviewsModule } from '@modules/reviews/reviews.module';
import { MistakesModule } from '@modules/mistakes/mistakes.module';
import { AttendanceModule } from '@modules/attendance/attendance.module';
import { AyahPerformanceModule } from '@modules/ayah-performance/ayah-performance.module';

// ── Application use cases ─────────────────────────────────────────────────────
import { GetStudentIntelligenceProfileUseCase } from './application/use-cases/get-student-intelligence-profile.use-case';
import { GetStudentRecommendationsUseCase } from './application/use-cases/get-student-recommendations.use-case';
import { GetStudentIntelligenceForecastUseCase } from './application/use-cases/get-student-intelligence-forecast.use-case';
import { GetParentInsightsUseCase } from './application/use-cases/get-parent-insights.use-case';
import { GetSheikhInsightsUseCase } from './application/use-cases/get-sheikh-insights.use-case';

// ── Infrastructure controllers ────────────────────────────────────────────────
import { IntelligenceController } from './infrastructure/controllers/intelligence.controller';
import { ParentIntelligenceController } from './infrastructure/controllers/parent-intelligence.controller';
import { SheikhIntelligenceController } from './infrastructure/controllers/sheikh-intelligence.controller';

/**
 * IntelligenceModule — Phase 13A: Siraja Intelligence Platform.
 *
 * A fully local, rule-based intelligence layer. No external AI services are
 * involved — all computation is deterministic TypeScript running in-process.
 *
 * The module is read-only: it imports repositories from existing modules but
 * never mutates them. This means it can be safely imported without creating
 * circular dependencies.
 *
 * The domain engines (MemorizationEngine, RevisionEngine, etc.) are plain
 * TypeScript classes instantiated directly inside use cases — they carry no
 * NestJS metadata and require no DI registration.
 *
 * Architecture:
 *   domain/engines/   — Pure deterministic computation classes.
 *   domain/rules/     — Tunable threshold constants.
 *   domain/entities/  — Output type interfaces.
 *   application/      — Use cases (orchestrate fetch + engines) and DTOs.
 *   infrastructure/   — Controllers (HTTP layer).
 */
@Module({
  imports: [
    StudentsModule,
    SheikhsModule,
    ParentsModule,
    ProgressModule,
    MemorizationModule,
    ReviewsModule,
    MistakesModule,
    AttendanceModule,
    AyahPerformanceModule,
  ],
  controllers: [
    IntelligenceController,
    ParentIntelligenceController,
    SheikhIntelligenceController,
  ],
  providers: [
    GetStudentIntelligenceProfileUseCase,
    GetStudentRecommendationsUseCase,
    GetStudentIntelligenceForecastUseCase,
    GetParentInsightsUseCase,
    GetSheikhInsightsUseCase,
  ],
  exports: [
    GetStudentIntelligenceProfileUseCase,
    GetStudentRecommendationsUseCase,
    GetStudentIntelligenceForecastUseCase,
    GetParentInsightsUseCase,
    GetSheikhInsightsUseCase,
  ],
})
export class IntelligenceModule {}
