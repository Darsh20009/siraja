import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ICircleRepository, CIRCLE_REPOSITORY } from '@modules/circles/domain/repositories/circle.repository.interface';
import { ISupervisorRepository, SUPERVISOR_REPOSITORY } from '@modules/supervisors/domain/repositories/supervisor.repository.interface';
import { IStudentEnrollmentRepository, STUDENT_ENROLLMENT_REPOSITORY } from '../../domain/repositories/student-enrollment.repository.interface';
import { EnrollmentType } from '@shared/enums/enrollment-type.enum';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';

@Injectable()
export class UnassignStudentFromCircleUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(CIRCLE_REPOSITORY) private readonly circleRepo: ICircleRepository,
    @Inject(SUPERVISOR_REPOSITORY) private readonly supervisorRepo: ISupervisorRepository,
    @Inject(STUDENT_ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IStudentEnrollmentRepository,
  ) {}

  async execute(tenantId: string, studentId: string, requester: AccessTokenPayload, notes?: string) {
    const student = await this.studentRepo.findById(tenantId, studentId);
    if (!student) throw new NotFoundException('Student not found.');
    if (!student.groupId) return; // already unassigned

    const roles = requester.roles as Role[];

    // SUPERVISOR: may only remove students from circles they supervise
    if (!roles.includes(Role.TENANT_ADMIN) && roles.includes(Role.SUPERVISOR)) {
      const supervisor = await this.supervisorRepo.findByUserId(tenantId, requester.sub);
      if (!supervisor || !supervisor.supervisedGroupIds.includes(student.groupId)) {
        throw new ForbiddenException('Supervisors may only unassign students from circles they supervise.');
      }
    }

    await Promise.all([
      this.circleRepo.removeStudent(tenantId, student.groupId, studentId),
      this.studentRepo.setGroup(tenantId, studentId, null),
      this.enrollmentRepo.create({
        tenantId,
        studentId,
        enrollmentType: EnrollmentType.CIRCLE_REMOVAL,
        circleId: null,
        previousCircleId: student.groupId,
        assignedById: requester.sub,
        notes,
      }),
    ]);
  }
}
