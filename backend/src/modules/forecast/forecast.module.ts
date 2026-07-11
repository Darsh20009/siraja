import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MemorizationRecord, MemorizationRecordSchema } from '@database/mongoose/schemas';
import { GetCompletionForecastUseCase } from './application/use-cases/get-completion-forecast.use-case';
import { ForecastController } from './infrastructure/controllers/forecast.controller';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';
import { ProgressModule } from '@modules/progress/progress.module';

/**
 * Forecast Module — Phase 7.
 *
 * Computes completion forecasts, weekly/monthly projections, and consistency
 * scores from historical memorization data. Purely analytical — no schema of
 * its own; reads MemorizationRecord and StudentProgress directly.
 *
 * Imports SheikhsModule and ParentsModule for ownership-scoped access checks.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MemorizationRecord.name, schema: MemorizationRecordSchema },
    ]),
    StudentsModule,
    SheikhsModule,
    ParentsModule,
    ProgressModule,
  ],
  controllers: [ForecastController],
  providers: [GetCompletionForecastUseCase],
  // Exported so AiModule (Phase 11) can wrap the deterministic forecast
  // with an AI-generated narrative explanation without recomputing it.
  exports: [GetCompletionForecastUseCase],
})
export class ForecastModule {}
