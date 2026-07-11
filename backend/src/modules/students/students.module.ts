import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Student, StudentSchema } from '@database/mongoose/schemas';
import { STUDENT_REPOSITORY } from './domain/repositories/student.repository.interface';
import { StudentRepository } from './infrastructure/repositories/student.repository';
import { CreateStudentUseCase } from './application/use-cases/create-student.use-case';
import { GetStudentUseCase } from './application/use-cases/get-student.use-case';
import { GetMyStudentProfileUseCase } from './application/use-cases/get-my-student-profile.use-case';
import { ListStudentsUseCase } from './application/use-cases/list-students.use-case';
import { UpdateStudentUseCase } from './application/use-cases/update-student.use-case';
import { RemoveStudentUseCase } from './application/use-cases/remove-student.use-case';
import { StudentsController } from './infrastructure/controllers/students.controller';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { ParentsModule } from '@modules/parents/parents.module';

/**
 * Students Module — Phase 6.
 *
 * Imports SheikhsModule and ParentsModule to access their exported
 * repository tokens for role-scoped ownership checks in use-cases
 * (e.g. verifying a sheikh may only access their assigned students).
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Student.name, schema: StudentSchema }]),
    SheikhsModule,
    ParentsModule,
  ],
  controllers: [StudentsController],
  providers: [
    { provide: STUDENT_REPOSITORY, useClass: StudentRepository },
    CreateStudentUseCase,
    GetStudentUseCase,
    GetMyStudentProfileUseCase,
    ListStudentsUseCase,
    UpdateStudentUseCase,
    RemoveStudentUseCase,
  ],
  exports: [STUDENT_REPOSITORY],
})
export class StudentsModule {}
