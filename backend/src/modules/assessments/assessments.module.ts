import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Assessment, AssessmentSchema } from '@database/mongoose/schemas';
import { ASSESSMENT_REPOSITORY } from './domain/repositories/assessment.repository.interface';
import { AssessmentRepository } from './infrastructure/repositories/assessment.repository';
import { CreateAssessmentUseCase } from './application/use-cases/create-assessment.use-case';
import { ListAssessmentsUseCase } from './application/use-cases/list-assessments.use-case';
import { GetAssessmentUseCase } from './application/use-cases/get-assessment.use-case';
import { UpdateAssessmentUseCase } from './application/use-cases/update-assessment.use-case';
import { AssessmentsController } from './infrastructure/controllers/assessments.controller';
import { StudentsModule } from '@modules/students/students.module';
import { ParentsModule } from '@modules/parents/parents.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';

/**
 * Assessments Module — Phase 8.
 *
 * Periodic holistic student evaluations: Weekly, Monthly, Custom.
 * Part of the Reporting Engine — assessments feed into student and
 * parent reports alongside attendance and exam data.
 *
 * Exports ASSESSMENT_REPOSITORY for ReportingModule.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Assessment.name, schema: AssessmentSchema }]),
    StudentsModule,
    ParentsModule,
    SheikhsModule,
  ],
  controllers: [AssessmentsController],
  providers: [
    { provide: ASSESSMENT_REPOSITORY, useClass: AssessmentRepository },
    CreateAssessmentUseCase,
    ListAssessmentsUseCase,
    GetAssessmentUseCase,
    UpdateAssessmentUseCase,
  ],
  exports: [ASSESSMENT_REPOSITORY],
})
export class AssessmentsModule {}
