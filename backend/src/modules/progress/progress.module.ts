import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MemorizationRecord,
  MemorizationRecordSchema,
  ReviewRecord,
  ReviewRecordSchema,
  StudentProgress,
  StudentProgressSchema,
} from '@database/mongoose/schemas';
import { STUDENT_PROGRESS_REPOSITORY } from './domain/repositories/student-progress.repository.interface';
import { StudentProgressRepository } from './infrastructure/repositories/student-progress.repository';
import { GetStudentProgressUseCase } from './application/use-cases/get-student-progress.use-case';
import { UpdateStudentProgressUseCase } from './application/use-cases/update-student-progress.use-case';
import { ProgressController } from './infrastructure/controllers/progress.controller';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';

/**
 * Progress Module — Phase 7.
 *
 * Maintains and exposes the materialised progress summary per student.
 * `UpdateStudentProgressUseCase` is exported so MemorizationModule and
 * ReviewsModule can trigger recalculation after each new record.
 *
 * Imports SheikhsModule and ParentsModule for ownership checks in
 * GetStudentProgressUseCase. Registers MemorizationRecord and ReviewRecord
 * models directly (no cross-module repo injection) to avoid circular deps.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StudentProgress.name, schema: StudentProgressSchema },
      { name: MemorizationRecord.name, schema: MemorizationRecordSchema },
      { name: ReviewRecord.name, schema: ReviewRecordSchema },
    ]),
    StudentsModule,
    SheikhsModule,
    ParentsModule,
  ],
  controllers: [ProgressController],
  providers: [
    { provide: STUDENT_PROGRESS_REPOSITORY, useClass: StudentProgressRepository },
    GetStudentProgressUseCase,
    UpdateStudentProgressUseCase,
  ],
  exports: [
    STUDENT_PROGRESS_REPOSITORY,
    UpdateStudentProgressUseCase,
  ],
})
export class ProgressModule {}
