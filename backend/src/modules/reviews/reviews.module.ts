import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MemorizationRecord,
  MemorizationRecordSchema,
  ReviewRecord,
  ReviewRecordSchema,
} from '@database/mongoose/schemas';
import { REVIEW_RECORD_REPOSITORY } from './domain/repositories/review-record.repository.interface';
import { ReviewRecordRepository } from './infrastructure/repositories/review-record.repository';
import { CreateReviewRecordUseCase } from './application/use-cases/create-review-record.use-case';
import { ListReviewRecordsUseCase } from './application/use-cases/list-review-records.use-case';
import { GetReviewRecordUseCase } from './application/use-cases/get-review-record.use-case';
import { GetReviewPerformanceUseCase } from './application/use-cases/get-review-performance.use-case';
import { ReviewsController } from './infrastructure/controllers/reviews.controller';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';
import { ProgressModule } from '@modules/progress/progress.module';
import { AyahPerformanceModule } from '@modules/ayah-performance/ayah-performance.module';
import { AyahsModule } from '@modules/ayahs/ayahs.module';

/**
 * Reviews Module — Phase 7.
 *
 * Manages revision (murājaʿah) sessions for previously memorized material.
 * Imports SheikhsModule and ParentsModule for ownership-scoped use-cases.
 * Imports ProgressModule to trigger progress recalculation after each record.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReviewRecord.name, schema: ReviewRecordSchema },
      { name: MemorizationRecord.name, schema: MemorizationRecordSchema },
    ]),
    StudentsModule,
    SheikhsModule,
    ParentsModule,
    ProgressModule,
    AyahPerformanceModule,
    AyahsModule,
  ],
  controllers: [ReviewsController],
  providers: [
    { provide: REVIEW_RECORD_REPOSITORY, useClass: ReviewRecordRepository },
    CreateReviewRecordUseCase,
    ListReviewRecordsUseCase,
    GetReviewRecordUseCase,
    GetReviewPerformanceUseCase,
  ],
  exports: [REVIEW_RECORD_REPOSITORY],
})
export class ReviewsModule {}
