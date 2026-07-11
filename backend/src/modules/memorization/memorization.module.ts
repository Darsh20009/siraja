import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MemorizationRecord,
  MemorizationRecordSchema,
  ReviewRecord,
  ReviewRecordSchema,
} from '@database/mongoose/schemas';
import { MEMORIZATION_RECORD_REPOSITORY } from './domain/repositories/memorization-record.repository.interface';
import { MemorizationRecordRepository } from './infrastructure/repositories/memorization-record.repository';
import { CreateMemorizationRecordUseCase } from './application/use-cases/create-memorization-record.use-case';
import { ListMemorizationRecordsUseCase } from './application/use-cases/list-memorization-records.use-case';
import { GetMemorizationRecordUseCase } from './application/use-cases/get-memorization-record.use-case';
import { ApproveMemorizationRecordUseCase } from './application/use-cases/approve-memorization-record.use-case';
import { MemorizationController } from './infrastructure/controllers/memorization.controller';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';
import { ProgressModule } from '@modules/progress/progress.module';
import { AyahPerformanceModule } from '@modules/ayah-performance/ayah-performance.module';
import { AyahsModule } from '@modules/ayahs/ayahs.module';

/**
 * Memorization Module — Phase 7.
 *
 * Manages the memorization evaluation lifecycle:
 *   Sheikh creates a record → sheikh approves (COMPLETED + grade).
 *
 * Imports StudentsModule, SheikhsModule, ParentsModule for ownership
 * checks (identity resolution and scoping) in use-cases.
 * Imports ProgressModule to trigger materialised-progress recalculation.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MemorizationRecord.name, schema: MemorizationRecordSchema },
      { name: ReviewRecord.name, schema: ReviewRecordSchema },
    ]),
    StudentsModule,
    SheikhsModule,
    ParentsModule,
    ProgressModule,
    AyahPerformanceModule,
    AyahsModule,
  ],
  controllers: [MemorizationController],
  providers: [
    { provide: MEMORIZATION_RECORD_REPOSITORY, useClass: MemorizationRecordRepository },
    CreateMemorizationRecordUseCase,
    ListMemorizationRecordsUseCase,
    GetMemorizationRecordUseCase,
    ApproveMemorizationRecordUseCase,
  ],
  exports: [MEMORIZATION_RECORD_REPOSITORY],
})
export class MemorizationModule {}
