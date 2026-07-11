import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';

@Injectable()
export class UnlinkParentFromStudentUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository,
  ) {}

  async execute(tenantId: string, studentId: string, parentId: string) {
    const [student, parent] = await Promise.all([
      this.studentRepo.findById(tenantId, studentId),
      this.parentRepo.findById(tenantId, parentId),
    ]);
    if (!student) throw new NotFoundException('Student not found.');
    if (!parent) throw new NotFoundException('Parent not found.');

    await Promise.all([
      this.parentRepo.removeChild(tenantId, parentId, studentId),
      this.studentRepo.removeParent?.(tenantId, studentId, parentId),
    ]);
  }
}
