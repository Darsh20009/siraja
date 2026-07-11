import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { IStudentEnrollmentRepository, STUDENT_ENROLLMENT_REPOSITORY } from '../../domain/repositories/student-enrollment.repository.interface';
import { EnrollmentType } from '@shared/enums/enrollment-type.enum';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';

@Injectable()
export class UnassignStudentFromSheikhUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(STUDENT_ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IStudentEnrollmentRepository,
  ) {}

  async execute(tenantId: string, studentId: string, requester: AccessTokenPayload) {
    const student = await this.studentRepo.findById(tenantId, studentId);
    if (!student) throw new NotFoundException('Student not found.');
    if (!student.sheikhId) return;

    await Promise.all([
      this.studentRepo.setSheikh(tenantId, studentId, null),
      this.enrollmentRepo.create({
        tenantId,
        studentId,
        enrollmentType: EnrollmentType.SHEIKH_REMOVAL,
        sheikhId: null,
        assignedById: requester.sub,
        notes: 'Direct sheikh assignment removed.',
      }),
    ]);
  }
}
