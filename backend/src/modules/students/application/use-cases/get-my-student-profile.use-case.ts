import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IStudentRepository, STUDENT_REPOSITORY } from '../../domain/repositories/student.repository.interface';

/** Used by the `/students/me` endpoint — returns the calling user's own student profile. */
@Injectable()
export class GetMyStudentProfileUseCase {
  constructor(@Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository) {}

  async execute(tenantId: string, userId: string) {
    const student = await this.studentRepo.findByUserId(tenantId, userId);
    if (!student) throw new NotFoundException('Student profile not found for this user.');
    return student;
  }
}
