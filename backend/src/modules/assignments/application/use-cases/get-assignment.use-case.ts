import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ASSIGNMENT_REPOSITORY, IAssignmentRepository } from '../../domain/repositories/assignment.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * GetAssignmentUseCase
 *
 * Fetches a single assignment with per-instance ownership enforcement.
 *
 * Ownership rules:
 *   TENANT_ADMIN / SUPERVISOR → unrestricted
 *   SHEIKH     → must have assigned it (assignedById === user.sub) OR it's in their circle
 *   PARENT     → assignment's studentId must be in parent.studentIds
 *   STUDENT    → assignment's studentId must match their own profile id
 */
@Injectable()
export class GetAssignmentUseCase {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: IAssignmentRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, id: string) {
    const assignment = await this.assignmentRepo.findById(user.tenantId, id);
    if (!assignment) throw new NotFoundException('Assignment not found.');

    const roles = user.roles as Role[];

    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      return assignment;
    }

    if (roles.includes(Role.SHEIKH)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');

      const assigned = assignment.assignedById === user.sub; // assignedById stores User ObjectId
      const inCircle = assignment.groupId != null && sheikh.groupIds.includes(assignment.groupId);
      if (!assigned && !inCircle) {
        throw new ForbiddenException('Sheikhs may only access assignments they issued or for their circles.');
      }
      return assignment;
    }

    if (roles.includes(Role.PARENT)) {
      const parent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!parent || !parent.studentIds.includes(assignment.studentId)) {
        throw new ForbiddenException("Parents may only access their linked children's assignments.");
      }
      return assignment;
    }

    if (roles.includes(Role.STUDENT)) {
      const profile = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!profile || profile.id !== assignment.studentId) {
        throw new ForbiddenException('Students may only access their own assignments.');
      }
      return assignment;
    }

    throw new ForbiddenException();
  }
}
