import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Assignment, AssignmentSchema } from '@database/mongoose/schemas';
import { ASSIGNMENT_REPOSITORY } from './domain/repositories/assignment.repository.interface';
import { AssignmentRepository } from './infrastructure/repositories/assignment.repository';
import { CreateAssignmentUseCase } from './application/use-cases/create-assignment.use-case';
import { ListAssignmentsUseCase } from './application/use-cases/list-assignments.use-case';
import { GetAssignmentUseCase } from './application/use-cases/get-assignment.use-case';
import { SubmitAssignmentUseCase } from './application/use-cases/submit-assignment.use-case';
import { ReviewAssignmentUseCase } from './application/use-cases/review-assignment.use-case';
import { AssignmentsController } from './infrastructure/controllers/assignments.controller';
import { StudentsModule } from '@modules/students/students.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';

/**
 * Assignments Module — Phase 8.
 *
 * Manages homework, revision tasks, and memorization tasks.
 * Lifecycle: Assigned → Submitted → Reviewed | Overdue.
 *
 * NOTE: this module is for academic task assignments (sheikh → student).
 * It is distinct from StudentAssignmentsModule (Phase 6) which handles
 * sheikh-to-circle organisational assignments.
 *
 * Exports ASSIGNMENT_REPOSITORY for ReportingModule analytics.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Assignment.name, schema: AssignmentSchema }]),
    StudentsModule,
    SheikhsModule,
    ParentsModule,
  ],
  controllers: [AssignmentsController],
  providers: [
    { provide: ASSIGNMENT_REPOSITORY, useClass: AssignmentRepository },
    CreateAssignmentUseCase,
    ListAssignmentsUseCase,
    GetAssignmentUseCase,
    SubmitAssignmentUseCase,
    ReviewAssignmentUseCase,
  ],
  exports: [ASSIGNMENT_REPOSITORY],
})
export class AssignmentsModule {}
