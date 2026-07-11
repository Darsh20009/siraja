import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { ISupervisorRepository, SUPERVISOR_REPOSITORY } from '@modules/supervisors/domain/repositories/supervisor.repository.interface';
import { IStudentEnrollmentRepository, STUDENT_ENROLLMENT_REPOSITORY } from '../../domain/repositories/student-enrollment.repository.interface';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';

@Injectable()
export class GetAssignmentHistoryUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository,
    @Inject(SUPERVISOR_REPOSITORY) private readonly supervisorRepo: ISupervisorRepository,
    @Inject(STUDENT_ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IStudentEnrollmentRepository,
  ) {}

  async execute(tenantId: string, studentId: string, requester: AccessTokenPayload) {
    const student = await this.studentRepo.findById(tenantId, studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = requester.roles as Role[];

    if (!roles.includes(Role.TENANT_ADMIN)) {
      if (roles.includes(Role.SUPERVISOR)) {
        // Supervisor: student must be enrolled in one of their supervised circles
        const supervisor = await this.supervisorRepo.findByUserId(tenantId, requester.sub);
        const inScope =
          supervisor && student.groupId && supervisor.supervisedGroupIds.includes(student.groupId);
        if (!inScope) {
          throw new ForbiddenException('Supervisors may only view history for students in their circles.');
        }
      } else if (roles.includes(Role.SHEIKH)) {
        // Sheikh: student must be in their circle or directly assigned
        const sheikh = await this.sheikhRepo.findByUserId(tenantId, requester.sub);
        const inScope =
          sheikh &&
          ((student.groupId && sheikh.groupIds.includes(student.groupId)) ||
            student.sheikhId === sheikh.id);
        if (!inScope) {
          throw new ForbiddenException('Sheikhs may only view history for their assigned students.');
        }
      } else if (roles.includes(Role.PARENT)) {
        // Parent: student must be a linked child
        const parent = await this.parentRepo.findByUserId(tenantId, requester.sub);
        if (!parent || !parent.studentIds.includes(studentId)) {
          throw new ForbiddenException('Parents may only view history for their linked children.');
        }
      } else if (roles.includes(Role.STUDENT)) {
        // Student: own history only
        if (student.userId !== requester.sub) {
          throw new ForbiddenException('Students may only view their own assignment history.');
        }
      } else {
        throw new ForbiddenException();
      }
    }

    return this.enrollmentRepo.findByStudent(tenantId, studentId);
  }
}
