import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Parent, ParentSchema, Student, StudentSchema } from '@database/mongoose/schemas';
import { PARENT_REPOSITORY } from './domain/repositories/parent.repository.interface';
import { ParentRepository } from './infrastructure/repositories/parent.repository';
import { CreateParentUseCase } from './application/use-cases/create-parent.use-case';
import { GetParentUseCase } from './application/use-cases/get-parent.use-case';
import { GetMyParentProfileUseCase } from './application/use-cases/get-my-parent-profile.use-case';
import { ListParentsUseCase } from './application/use-cases/list-parents.use-case';
import { ListChildrenUseCase } from './application/use-cases/list-children.use-case';
import { UpdateParentUseCase } from './application/use-cases/update-parent.use-case';
import { ParentsController } from './infrastructure/controllers/parents.controller';
import { STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { StudentRepository } from '@modules/students/infrastructure/repositories/student.repository';

/**
 * Parents Module — Phase 6.
 *
 * Registers its own Student model (separate forFeature registration) so
 * ListChildrenUseCase can resolve children without creating a circular
 * module dependency (StudentsModule ↔ ParentsModule).
 *
 * The STUDENT_REPOSITORY provided here is a local instance scoped to
 * ParentsModule; the authoritative token in StudentsModule is separate.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Parent.name, schema: ParentSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
  ],
  controllers: [ParentsController],
  providers: [
    { provide: PARENT_REPOSITORY, useClass: ParentRepository },
    { provide: STUDENT_REPOSITORY, useClass: StudentRepository },
    CreateParentUseCase,
    GetParentUseCase,
    GetMyParentProfileUseCase,
    ListParentsUseCase,
    ListChildrenUseCase,
    UpdateParentUseCase,
  ],
  exports: [PARENT_REPOSITORY],
})
export class ParentsModule {}
