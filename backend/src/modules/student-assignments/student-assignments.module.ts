import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentEnrollment, StudentEnrollmentSchema } from '@database/mongoose/schemas';
import { STUDENT_ENROLLMENT_REPOSITORY } from './domain/repositories/student-enrollment.repository.interface';
import { StudentEnrollmentRepository } from './infrastructure/repositories/student-enrollment.repository';
import { AssignStudentToCircleUseCase } from './application/use-cases/assign-student-to-circle.use-case';
import { UnassignStudentFromCircleUseCase } from './application/use-cases/unassign-student-from-circle.use-case';
import { AssignStudentToSheikhUseCase } from './application/use-cases/assign-student-to-sheikh.use-case';
import { UnassignStudentFromSheikhUseCase } from './application/use-cases/unassign-student-from-sheikh.use-case';
import { LinkParentToStudentUseCase } from './application/use-cases/link-parent-to-student.use-case';
import { UnlinkParentFromStudentUseCase } from './application/use-cases/unlink-parent-from-student.use-case';
import { GetAssignmentHistoryUseCase } from './application/use-cases/get-assignment-history.use-case';
import { StudentAssignmentsController } from './infrastructure/controllers/student-assignments.controller';
import { StudentsModule } from '@modules/students/students.module';
import { CirclesModule } from '@modules/circles/circles.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';
import { SupervisorsModule } from '@modules/supervisors/supervisors.module';

/**
 * Student Assignments Module — Phase 6.
 *
 * The coordination hub for all student placement operations. Imports the
 * four domain modules so their repository tokens are available for
 * injection into the multi-repository use-cases here.
 *
 * Dependency graph (no cycles):
 *   StudentAssignmentsModule
 *     → StudentsModule   (exports STUDENT_REPOSITORY)
 *     → CirclesModule    (exports CIRCLE_REPOSITORY → SheikhsModule, SupervisorsModule)
 *     → SheikhsModule    (exports SHEIKH_REPOSITORY)
 *     → ParentsModule    (exports PARENT_REPOSITORY)
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StudentEnrollment.name, schema: StudentEnrollmentSchema },
    ]),
    StudentsModule,
    CirclesModule,
    SheikhsModule,
    ParentsModule,
    SupervisorsModule,
  ],
  controllers: [StudentAssignmentsController],
  providers: [
    { provide: STUDENT_ENROLLMENT_REPOSITORY, useClass: StudentEnrollmentRepository },
    AssignStudentToCircleUseCase,
    UnassignStudentFromCircleUseCase,
    AssignStudentToSheikhUseCase,
    UnassignStudentFromSheikhUseCase,
    LinkParentToStudentUseCase,
    UnlinkParentFromStudentUseCase,
    GetAssignmentHistoryUseCase,
  ],
})
export class StudentAssignmentsModule {}
