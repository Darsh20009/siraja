import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ASSESSMENT_REPOSITORY, IAssessmentRepository } from '../../domain/repositories/assessment.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * GetAssessmentUseCase
 *
 * Fetches a single assessment with per-instance ownership enforcement.
 *
 * Ownership rules:
 *   TENANT_ADMIN / SUPERVISOR → unrestricted
 *   SHEIKH     → must have authored it (assessedById === user.sub) OR in their circle
 *   PARENT     → assessment's studentId must be in parent.studentIds
 *   STUDENT    → assessment's studentId must match their own profile id
 */
@Injectable()
export class GetAssessmentUseCase {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepo: IAssessmentRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, id: string) {
    const assessment = await this.assessmentRepo.findById(user.tenantId, id);
    if (!assessment) throw new NotFoundException('Assessment not found.');

    const roles = user.roles as Role[];

    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      return assessment;
    }

    if (roles.includes(Role.SHEIKH)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');

      const authored = assessment.assessedById === user.sub; // assessedById stores User ObjectId
      const inCircle = assessment.groupId != null && sheikh.groupIds.includes(assessment.groupId);
      if (!authored && !inCircle) {
        throw new ForbiddenException('Sheikhs may only access assessments they authored or for their circles.');
      }
      return assessment;
    }

    if (roles.includes(Role.PARENT)) {
      const parent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!parent || !parent.studentIds.includes(assessment.studentId)) {
        throw new ForbiddenException("Parents may only access their linked children's assessments.");
      }
      return assessment;
    }

    if (roles.includes(Role.STUDENT)) {
      const profile = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!profile || profile.id !== assessment.studentId) {
        throw new ForbiddenException('Students may only access their own assessments.');
      }
      return assessment;
    }

    throw new ForbiddenException();
  }
}
