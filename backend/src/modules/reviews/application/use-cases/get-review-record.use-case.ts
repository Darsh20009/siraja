import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  IReviewRecordRepository,
  REVIEW_RECORD_REPOSITORY,
} from '../../domain/repositories/review-record.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * GetReviewRecordUseCase
 *
 * Enforces per-instance ownership to prevent IDOR — mirrors GetMemorizationRecordUseCase.
 */
@Injectable()
export class GetReviewRecordUseCase {
  constructor(
    @Inject(REVIEW_RECORD_REPOSITORY)
    private readonly reviewRepo: IReviewRecordRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, id: string) {
    const record = await this.reviewRepo.findById(user.tenantId, id);
    if (!record) throw new NotFoundException('Review record not found.');

    const roles = user.roles as Role[];

    // TENANT_ADMIN / SUPERVISOR: unrestricted.
    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      return record;
    }

    // SHEIKH: may only see records they personally reviewed.
    // reviewedBy references User._id — user.sub comparison is correct.
    if (roles.includes(Role.SHEIKH)) {
      if (record.reviewedById !== user.sub) {
        throw new ForbiddenException('Sheikhs may only access records they reviewed.');
      }
      return record;
    }

    // STUDENT: own records only — resolve User ID → Student profile ID.
    if (roles.includes(Role.STUDENT)) {
      const profile = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!profile || profile.id !== record.studentId) {
        throw new ForbiddenException('Students may only access their own records.');
      }
      return record;
    }

    // PARENT: linked children only.
    if (roles.includes(Role.PARENT)) {
      const parent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!parent || !parent.studentIds.includes(record.studentId)) {
        throw new ForbiddenException('Parents may only access linked children\'s records.');
      }
      return record;
    }

    throw new ForbiddenException();
  }
}
