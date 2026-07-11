import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ASSESSMENT_REPOSITORY, IAssessmentRepository } from '../../domain/repositories/assessment.repository.interface';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * UpdateAssessmentUseCase
 *
 * Revise score, grade, status, or notes on an existing assessment.
 * RBAC: REPORTS.READ — assessments are part of the reporting layer.
 *
 * Ownership:
 *   SHEIKH     → must have authored it (assessedById === user.sub) OR in their circle
 *   SUPERVISOR / TENANT_ADMIN → unrestricted within tenant
 */
@Injectable()
export class UpdateAssessmentUseCase {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepo: IAssessmentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, id: string, dto: UpdateAssessmentDto) {
    const existing = await this.assessmentRepo.findById(user.tenantId, id);
    if (!existing) throw new NotFoundException('Assessment not found.');

    const roles = user.roles as Role[];

    if (!roles.includes(Role.TENANT_ADMIN) && !roles.includes(Role.SUPERVISOR)) {
      if (roles.includes(Role.SHEIKH)) {
        const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
        if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');

        const authored = existing.assessedById === user.sub; // assessedById stores User ObjectId
        const inCircle = existing.groupId != null && sheikh.groupIds.includes(existing.groupId);
        if (!authored && !inCircle) {
          throw new ForbiddenException('Sheikhs may only update assessments they authored or for their circles.');
        }
      } else {
        throw new ForbiddenException();
      }
    }

    return this.assessmentRepo.update(user.tenantId, id, {
      score: dto.score,
      grade: dto.grade,
      title: dto.title,
      notes: dto.notes,
      status: dto.status,
    });
  }
}
