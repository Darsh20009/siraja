import { Module } from '@nestjs/common';
import { AyahsModule } from '@modules/ayahs/ayahs.module';
import { AyahPerformanceModule } from '@modules/ayah-performance/ayah-performance.module';
import { AyahNotesModule } from '@modules/ayah-notes/ayah-notes.module';
import { MistakesModule } from '@modules/mistakes/mistakes.module';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';
import { GetSmartMushafViewUseCase } from './application/use-cases/get-smart-mushaf-view.use-case';
import { DetectMistakesUseCase } from './application/use-cases/detect-mistakes.use-case';
import { GetWeaknessSummaryUseCase } from '@modules/ayah-performance/application/use-cases/get-weakness-summary.use-case';
import { GetOverdueRevisionsUseCase } from '@modules/ayah-performance/application/use-cases/get-overdue-revisions.use-case';
import { WeaknessHeatmapService } from '@modules/ayah-performance/application/services/weakness-heatmap.service';
import { MistakeDetectorService } from '@shared/quran/mistake-detector.service';
import { SmartMushafController } from './infrastructure/controllers/smart-mushaf.controller';
import { SmartMushafLearningController } from './infrastructure/controllers/smart-mushaf-learning.controller';

/**
 * Smart Mushaf Module — Phase 9 facade + Phase 12B Learning Intelligence.
 *
 * Phase 12B additions:
 *  - DetectMistakesUseCase (stateless, LLM-free)
 *  - GetWeaknessSummaryUseCase (mastery heatmap rollup)
 *  - GetOverdueRevisionsUseCase (SM-2 scheduler)
 *  - SmartMushafLearningController (new endpoints)
 */
@Module({
  imports: [AyahsModule, AyahPerformanceModule, AyahNotesModule, MistakesModule, StudentsModule, SheikhsModule, ParentsModule],
  controllers: [SmartMushafController, SmartMushafLearningController],
  providers: [
    GetSmartMushafViewUseCase,
    MistakeDetectorService,
    WeaknessHeatmapService,
    DetectMistakesUseCase,
    GetWeaknessSummaryUseCase,
    GetOverdueRevisionsUseCase,
  ],
})
export class SmartMushafModule {}
