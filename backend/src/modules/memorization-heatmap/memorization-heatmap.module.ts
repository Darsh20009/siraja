import { Module } from '@nestjs/common';
import { AyahPerformanceModule } from '@modules/ayah-performance/ayah-performance.module';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';
import { GetHeatmapUseCase } from './application/use-cases/get-heatmap.use-case';
import { MemorizationHeatmapController } from './infrastructure/controllers/memorization-heatmap.controller';

/**
 * Memorization Heatmap Module — Phase 9 (Smart Mushaf Engine).
 * No schema of its own; reads `AyahPerformanceModule`'s materialised
 * `heatmapLevel` field.
 */
@Module({
  imports: [AyahPerformanceModule, StudentsModule, SheikhsModule, ParentsModule],
  controllers: [MemorizationHeatmapController],
  providers: [GetHeatmapUseCase],
})
export class MemorizationHeatmapModule {}
