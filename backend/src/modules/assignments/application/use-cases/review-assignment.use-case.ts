import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ASSIGNMENT_REPOSITORY, IAssignmentRepository } from '../../domain/repositories/assignment.repository.interface';
import { ReviewAssignmentDto } from '../dto/review-assignment.dto';
import { AssignmentStatus } from '@shared/enums/exam-assignment.enum';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * ReviewAssignmentUseCase
 *
 * Sheikh marks a submitted assignment as reviewed and optionally adds feedback.
 * RBAC: ASSIGNMENTS.APPROVE (Sheikh, Supervisor, Tenant Admin).
 *
 * Ownership:
 *   SHEIKH     → must have assigned it (assignedById === user.sub) OR it's in their circle
 *   SUPERVISOR / TENANT_ADMIN → unrestricted within tenant
 */
@Injectable()
export class ReviewAssignmentUseCase {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: IAssignmentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, id: string, dto: ReviewAssignmentDto) {
    const assignment = await this.assignmentRepo.findById(user.tenantId, id);
    if (!assignment) throw new NotFoundException('Assignment not found.');

    if (assignment.status !== AssignmentStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted assignments can be reviewed.');
    }

    const roles = user.roles as Role[];

    if (!roles.includes(Role.TENANT_ADMIN) && !roles.includes(Role.SUPERVISOR)) {
      if (roles.includes(Role.SHEIKH)) {
        const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
        if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');

        const isAssigner = assignment.assignedById === user.sub; // assignedById stores User ObjectId
        const inCircle = assignment.groupId != null && sheikh.groupIds.includes(assignment.groupId);
        if (!isAssigner && !inCircle) {
          throw new ForbiddenException('Sheikhs may only review assignments they issued or for their circles.');
        }
      } else {
        throw new ForbiddenException();
      }
    }

    return this.assignmentRepo.review(user.tenantId, id, {
      feedback: dto.feedback,
      status: AssignmentStatus.REVIEWED,
    });
  }
}
