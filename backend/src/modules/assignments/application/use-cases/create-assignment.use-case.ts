import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ASSIGNMENT_REPOSITORY, IAssignmentRepository } from '../../domain/repositories/assignment.repository.interface';
import { CreateAssignmentDto } from '../dto/create-assignment.dto';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * CreateAssignmentUseCase
 *
 * Sheikh assigns a task (homework / revision / memorization) to a student.
 * RBAC: ASSIGNMENTS.CREATE (Sheikh, Tenant Admin).
 *
 * Sheikh scope: may only assign to students in their circles.
 */
@Injectable()
export class CreateAssignmentUseCase {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: IAssignmentRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, dto: CreateAssignmentDto) {
    const student = await this.studentRepo.findById(user.tenantId, dto.studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];

    if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');

      const isInCircle =
        student.sheikhId === sheikh.id ||
        (student.groupId != null && sheikh.groupIds.includes(student.groupId));

      if (!isInCircle) {
        throw new ForbiddenException('Sheikhs may only assign tasks to students in their circles.');
      }
    }

    return this.assignmentRepo.create({
      tenantId: user.tenantId,
      studentId: dto.studentId,
      groupId: dto.groupId ?? student.groupId ?? undefined,
      assignedById: user.sub,
      type: dto.type,
      title: dto.title,
      description: dto.description,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
    });
  }
}
