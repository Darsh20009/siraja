import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IStudentRepository, STUDENT_REPOSITORY } from '../../domain/repositories/student.repository.interface';

@Injectable()
export class RemoveStudentUseCase {
  constructor(@Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository) {}

  async execute(tenantId: string, studentId: string) {
    const existing = await this.studentRepo.findById(tenantId, studentId);
    if (!existing) throw new NotFoundException('Student not found.');
    await this.studentRepo.remove(tenantId, studentId);
  }
}
