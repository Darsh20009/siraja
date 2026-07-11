import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  IReviewRecordRepository,
  ReviewListFilter,
  REVIEW_RECORD_REPOSITORY,
} from '../../domain/repositories/review-record.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';

export interface ListReviewQuery {
  studentId?: string;
  sessionId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListReviewRecordsUseCase {
  constructor(
    @Inject(REVIEW_RECORD_REPOSITORY)
    private readonly reviewRepo: IReviewRecordRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, query: ListReviewQuery) {
    const roles = user.roles as Role[];
    const filter: ReviewListFilter = {};

    if (query.sessionId) filter.sessionId = query.sessionId;
    if (query.fromDate) filter.fromDate = new Date(query.fromDate);
    if (query.toDate) filter.toDate = new Date(query.toDate);

    // TENANT_ADMIN / SUPERVISOR: unrestricted.
    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      if (query.studentId) filter.studentId = query.studentId;
      return this.reviewRepo.findAll(user.tenantId, filter, query.page ?? 1, query.limit ?? 20);
    }

    // SHEIKH: records they personally reviewed (reviewedBy is User._id — user.sub is correct).
    if (roles.includes(Role.SHEIKH)) {
      filter.reviewedById = user.sub;
      if (query.studentId) filter.studentId = query.studentId;
      return this.reviewRepo.findAll(user.tenantId, filter, query.page ?? 1, query.limit ?? 20);
    }

    // STUDENT: own records — resolve User ID → Student profile ID.
    if (roles.includes(Role.STUDENT)) {
      const profile = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!profile) return { items: [], total: 0 };
      filter.studentId = profile.id;
      return this.reviewRepo.findAll(user.tenantId, filter, query.page ?? 1, query.limit ?? 20);
    }

    // PARENT: linked children only.
    if (roles.includes(Role.PARENT)) {
      const parent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!parent || parent.studentIds.length === 0) return { items: [], total: 0 };
      if (query.studentId) {
        if (!parent.studentIds.includes(query.studentId)) {
          throw new ForbiddenException('Parents may only access linked children.');
        }
        filter.studentId = query.studentId;
      } else {
        filter.studentIds = parent.studentIds;
      }
      return this.reviewRepo.findAll(user.tenantId, filter, query.page ?? 1, query.limit ?? 20);
    }

    throw new ForbiddenException();
  }
}
