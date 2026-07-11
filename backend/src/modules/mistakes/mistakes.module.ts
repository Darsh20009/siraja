import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuranMistake, QuranMistakeSchema } from '@database/mongoose/schemas';
import { QURAN_MISTAKE_REPOSITORY } from './domain/repositories/quran-mistake.repository.interface';
import { QuranMistakeRepository } from './infrastructure/repositories/quran-mistake.repository';
import { LogMistakeUseCase } from './application/use-cases/log-mistake.use-case';
import { ListMistakesUseCase } from './application/use-cases/list-mistakes.use-case';
import { ResolveMistakeUseCase } from './application/use-cases/resolve-mistake.use-case';
import { GetMistakeFrequencyUseCase } from './application/use-cases/get-mistake-frequency.use-case';
import { MistakesController } from './infrastructure/controllers/mistakes.controller';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';
import { AyahPerformanceModule } from '@modules/ayah-performance/ayah-performance.module';

/**
 * Mistakes Module — Phase 7.
 *
 * Tracks granular recitation mistakes per memorization or review record.
 * Imports SheikhsModule and ParentsModule for ownership-scoped use-cases.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: QuranMistake.name, schema: QuranMistakeSchema }]),
    StudentsModule,
    SheikhsModule,
    ParentsModule,
    AyahPerformanceModule,
  ],
  controllers: [MistakesController],
  providers: [
    { provide: QURAN_MISTAKE_REPOSITORY, useClass: QuranMistakeRepository },
    LogMistakeUseCase,
    ListMistakesUseCase,
    ResolveMistakeUseCase,
    GetMistakeFrequencyUseCase,
  ],
  exports: [QURAN_MISTAKE_REPOSITORY],
})
export class MistakesModule {}
