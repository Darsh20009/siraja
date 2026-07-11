import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { LinkParentStudentDto } from '../dto/link-parent-student.dto';

@Injectable()
export class LinkParentToStudentUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository,
  ) {}

  async execute(tenantId: string, dto: LinkParentStudentDto) {
    const [student, parent] = await Promise.all([
      this.studentRepo.findById(tenantId, dto.studentId),
      this.parentRepo.findById(tenantId, dto.parentId),
    ]);
    if (!student) throw new NotFoundException('Student not found.');
    if (!parent) throw new NotFoundException('Parent not found.');

    // Idempotent: skip if already linked
    if (!parent.studentIds.includes(dto.studentId)) {
      await Promise.all([
        this.parentRepo.addChild(tenantId, dto.parentId, dto.studentId),
        // student.parents is updated via the student repo (denormalized inverse)
      ]);
      // Update student's parents list as well (bidirectional reference)
      await this.studentRepo.addParent?.(tenantId, dto.studentId, dto.parentId);
    }

    return { studentId: dto.studentId, parentId: dto.parentId, linked: true };
  }
}
