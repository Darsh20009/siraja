import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IStudentEnrollmentRepository, STUDENT_ENROLLMENT_REPOSITORY } from '../../domain/repositories/student-enrollment.repository.interface';
import { AssignStudentSheikhDto } from '../dto/assign-student-sheikh.dto';
import { EnrollmentType } from '@shared/enums/enrollment-type.enum';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';

@Injectable()
export class AssignStudentToSheikhUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
    @Inject(STUDENT_ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IStudentEnrollmentRepository,
  ) {}

  /**
   * Creates a direct 1-on-1 sheikh assignment (independent of circle membership).
   * Used for private tutoring sessions distinct from the student's circle sheikh.
   * Requires SHEIKHS.ASSIGN — only TENANT_ADMIN holds this permission.
   */
  async execute(tenantId: string, dto: AssignStudentSheikhDto, requester: AccessTokenPayload) {
    const [student, sheikh] = await Promise.all([
      this.studentRepo.findById(tenantId, dto.studentId),
      this.sheikhRepo.findById(tenantId, dto.sheikhId),
    ]);
    if (!student) throw new NotFoundException('Student not found.');
    if (!sheikh) throw new NotFoundException('Sheikh not found.');

    await Promise.all([
      this.studentRepo.setSheikh(tenantId, dto.studentId, dto.sheikhId),
      this.enrollmentRepo.create({
        tenantId,
        studentId: dto.studentId,
        enrollmentType: EnrollmentType.SHEIKH_ASSIGNMENT,
        sheikhId: dto.sheikhId,
        assignedById: requester.sub,
        notes: dto.notes,
      }),
    ]);

    return this.studentRepo.findById(tenantId, dto.studentId);
  }
}
