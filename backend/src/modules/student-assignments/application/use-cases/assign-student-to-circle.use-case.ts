import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ICircleRepository, CIRCLE_REPOSITORY } from '@modules/circles/domain/repositories/circle.repository.interface';
import { ISupervisorRepository, SUPERVISOR_REPOSITORY } from '@modules/supervisors/domain/repositories/supervisor.repository.interface';
import { IStudentEnrollmentRepository, STUDENT_ENROLLMENT_REPOSITORY } from '../../domain/repositories/student-enrollment.repository.interface';
import { AssignStudentCircleDto } from '../dto/assign-student-circle.dto';
import { EnrollmentType } from '@shared/enums/enrollment-type.enum';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';

@Injectable()
export class AssignStudentToCircleUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(CIRCLE_REPOSITORY) private readonly circleRepo: ICircleRepository,
    @Inject(SUPERVISOR_REPOSITORY) private readonly supervisorRepo: ISupervisorRepository,
    @Inject(STUDENT_ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IStudentEnrollmentRepository,
  ) {}

  /**
   * Assigns a student to a circle. If the student already belongs to a different
   * circle, records this as a CIRCLE_REASSIGNMENT; otherwise as CIRCLE_ASSIGNMENT.
   *
   * RBAC: TENANT_ADMIN may assign to any circle. SUPERVISOR may only assign to
   * circles in their supervised set.
   */
  async execute(tenantId: string, dto: AssignStudentCircleDto, requester: AccessTokenPayload) {
    const roles = requester.roles as Role[];

    // SUPERVISOR: restrict to supervised circles only
    if (!roles.includes(Role.TENANT_ADMIN) && roles.includes(Role.SUPERVISOR)) {
      const supervisor = await this.supervisorRepo.findByUserId(tenantId, requester.sub);
      if (!supervisor || !supervisor.supervisedGroupIds.includes(dto.circleId)) {
        throw new ForbiddenException('Supervisors may only assign students to circles they supervise.');
      }
    }

    const [student, circle] = await Promise.all([
      this.studentRepo.findById(tenantId, dto.studentId),
      this.circleRepo.findById(tenantId, dto.circleId),
    ]);
    if (!student) throw new NotFoundException('Student not found.');
    if (!circle) throw new NotFoundException('Circle not found.');

    const previousCircleId = student.groupId ?? null;
    const isReassignment = !!previousCircleId && previousCircleId !== dto.circleId;
    const enrollmentType = isReassignment ? EnrollmentType.CIRCLE_REASSIGNMENT : EnrollmentType.CIRCLE_ASSIGNMENT;

    if (isReassignment && previousCircleId) {
      await this.circleRepo.removeStudent(tenantId, previousCircleId, dto.studentId);
    }

    await Promise.all([
      this.studentRepo.setGroup(tenantId, dto.studentId, dto.circleId),
      this.circleRepo.addStudent(tenantId, dto.circleId, dto.studentId),
      this.enrollmentRepo.create({
        tenantId,
        studentId: dto.studentId,
        enrollmentType,
        circleId: dto.circleId,
        previousCircleId,
        sheikhId: circle.sheikhId ?? null,
        assignedById: requester.sub,
        notes: dto.notes,
      }),
    ]);

    return this.studentRepo.findById(tenantId, dto.studentId);
  }
}
