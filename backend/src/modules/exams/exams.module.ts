import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Exam, ExamSchema } from '@database/mongoose/schemas';
import { EXAM_REPOSITORY } from './domain/repositories/exam.repository.interface';
import { ExamRepository } from './infrastructure/repositories/exam.repository';
import { CreateExamUseCase } from './application/use-cases/create-exam.use-case';
import { ListExamsUseCase } from './application/use-cases/list-exams.use-case';
import { GetExamUseCase } from './application/use-cases/get-exam.use-case';
import { GradeExamUseCase } from './application/use-cases/grade-exam.use-case';
import { ExamsController } from './infrastructure/controllers/exams.controller';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';

/**
 * Exams Module — Phase 8.
 *
 * Manages formal exam scheduling and grading lifecycle:
 *   Scheduled → In Progress → Graded | Cancelled.
 *
 * Supports three exam categories: Memorization, Revision, Completion.
 * Exports EXAM_REPOSITORY for ReportingModule analytics.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Exam.name, schema: ExamSchema }]),
    StudentsModule,
    SheikhsModule,
    ParentsModule,
  ],
  controllers: [ExamsController],
  providers: [
    { provide: EXAM_REPOSITORY, useClass: ExamRepository },
    CreateExamUseCase,
    ListExamsUseCase,
    GetExamUseCase,
    GradeExamUseCase,
  ],
  exports: [EXAM_REPOSITORY],
})
export class ExamsModule {}
