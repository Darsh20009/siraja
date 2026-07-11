import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IStudentRepository, STUDENT_REPOSITORY } from '../../domain/repositories/student.repository.interface';
import { UpdateStudentDto } from '../dto/update-student.dto';

@Injectable()
export class UpdateStudentUseCase {
  constructor(@Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository) {}

  async execute(tenantId: string, studentId: string, dto: UpdateStudentDto) {
    const existing = await this.studentRepo.findById(tenantId, studentId);
    if (!existing) throw new NotFoundException('Student not found.');

    return this.studentRepo.update(tenantId, studentId, {
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      currentJuzNumber: dto.currentJuzNumber,
      currentMemorizationStatus: dto.currentMemorizationStatus,
      isActive: dto.isActive,
      notes: dto.notes,
    });
  }
}
