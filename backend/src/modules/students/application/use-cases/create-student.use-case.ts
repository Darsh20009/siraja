import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { IStudentRepository, STUDENT_REPOSITORY } from '../../domain/repositories/student.repository.interface';
import { CreateStudentDto } from '../dto/create-student.dto';

@Injectable()
export class CreateStudentUseCase {
  constructor(@Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository) {}

  async execute(tenantId: string, dto: CreateStudentDto) {
    const existing = await this.studentRepo.findByUserId(tenantId, dto.userId);
    if (existing) {
      throw new ConflictException('A student profile already exists for this user in the tenant.');
    }
    return this.studentRepo.create({
      tenantId,
      userId: dto.userId,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      notes: dto.notes,
    });
  }
}
