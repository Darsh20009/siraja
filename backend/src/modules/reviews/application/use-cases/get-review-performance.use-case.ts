import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  IReviewRecordRepository,
  REVIEW_RECORD_REPOSITORY,
} from '../../domain/repositories/review-record.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * GetReviewPerformanceUseCase
 *
 * Returns aggregate revision statistics for a given Student profile ID.
 * `studentId` parameter is a Student profile ID (not a User ID).
 * Ownership enforced per-role — mirrors GetStudentUseCase.
 */
@Injectable()
export class GetReviewPerformanceUseCase {
  constructor(
    @Inject(REVIEW_RECORD_REPOSITORY)
    private readonly reviewRepo: IReviewRecordRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, studentId: string) {
    const student = await this.studentRepo.findById(user.tenantId, studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];

    // TENANT_ADMIN / SUPERVISOR: unrestricted.
    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      return this.reviewRepo.getStudentPerformance(user.tenantId, studentId);
    }

    // STUDENT: own profile only — resolve from userId.
    if (roles.includes(Role.STUDENT)) {
      const ownProfile = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!ownProfile || ownProfile.id !== studentId) {
        throw new ForbiddenException('Students may only access their own performance data.');
      }
      return this.reviewRepo.getStudentPerformance(user.tenantId, studentId);
    }

    // SHEIKH: only for students assigned to them or in their circles.
    if (roles.includes(Role.SHEIKH)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');
      const isAssigned =
        student.sheikhId === sheikh.id ||
        (student.groupId != null && sheikh.groupIds.includes(student.groupId));
      if (!isAssigned) throw new ForbiddenException('Sheikhs may only access their assigned students.');
      return this.reviewRepo.getStudentPerformance(user.tenantId, studentId);
    }

    // PARENT: only linked children.
    if (roles.includes(Role.PARENT)) {
      const parent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!parent || !parent.studentIds.includes(studentId)) {
        throw new ForbiddenException('Parents may only access linked children.');
      }
      return this.reviewRepo.getStudentPerformance(user.tenantId, studentId);
    }

    throw new ForbiddenException();
  }
}
