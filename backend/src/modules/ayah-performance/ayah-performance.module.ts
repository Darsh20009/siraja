import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AyahPerformance, AyahPerformanceSchema } from '@database/mongoose/schemas';
import { AYAH_PERFORMANCE_REPOSITORY } from './domain/repositories/ayah-performance.repository.interface';
import { AyahPerformanceRepository } from './infrastructure/repositories/ayah-performance.repository';
import { GetAyahPerformanceUseCase } from './application/use-cases/get-ayah-performance.use-case';
import { ListAyahPerformanceUseCase } from './application/use-cases/list-ayah-performance.use-case';
import { UpdateAyahPerformanceUseCase } from './application/use-cases/update-ayah-performance.use-case';
import { AyahPerformanceController } from './infrastructure/controllers/ayah-performance.controller';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';

/**
 * Ayah Performance Module — Phase 9 (Smart Mushaf Engine).
 *
 * Owns the materialised per-(student, ayah) `ayah_performance` collection.
 * `recordMemorization`/`recordRevision`/`recordMistake` on the exported
 * repository are called from MemorizationModule/ReviewsModule/MistakesModule
 * (Phase 7) after their respective write flows, the same
 * fire-and-forget cross-module pattern ProgressModule uses.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: AyahPerformance.name, schema: AyahPerformanceSchema }]),
    StudentsModule,
    SheikhsModule,
    ParentsModule,
  ],
  controllers: [AyahPerformanceController],
  providers: [
    { provide: AYAH_PERFORMANCE_REPOSITORY, useClass: AyahPerformanceRepository },
    GetAyahPerformanceUseCase,
    ListAyahPerformanceUseCase,
    UpdateAyahPerformanceUseCase,
  ],
  exports: [AYAH_PERFORMANCE_REPOSITORY],
})
export class AyahPerformanceModule {}
