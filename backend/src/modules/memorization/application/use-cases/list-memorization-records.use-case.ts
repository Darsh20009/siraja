import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  IMemorizationRecordRepository,
  MemorizationListFilter,
  MEMORIZATION_RECORD_REPOSITORY,
} from '../../domain/repositories/memorization-record.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';
import { MemorizationStatus } from '@shared/enums/memorization.enum';

export interface ListMemorizationQuery {
  studentId?: string;
  sessionId?: string;
  status?: MemorizationStatus;
  page?: number;
  limit?: number;
}

/**
 * ListMemorizationRecordsUseCase
 *
 * Role-scoped list — mirrors the pattern in ListStudentsUseCase:
 *  - STUDENT   → own records only (resolved by userId → Student profile id)
 *  - SHEIKH    → records they personally evaluated (evaluatedBy = user.sub, a User ID)
 *  - PARENT    → records for their linked children (parent.studentIds)
 *  - SUPERVISOR / TENANT_ADMIN → full tenant view
 */
@Injectable()
export class ListMemorizationRecordsUseCase {
  constructor(
    @Inject(MEMORIZATION_RECORD_REPOSITORY)
    private readonly memorizationRepo: IMemorizationRecordRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, query: ListMemorizationQuery) {
    const roles = user.roles as Role[];
    const filter: MemorizationListFilter = {};

    if (query.sessionId) filter.sessionId = query.sessionId;
    if (query.status) filter.status = query.status;

    // ── TENANT_ADMIN / SUPERVISOR: unrestricted ────────────────────────────
    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      if (query.studentId) filter.studentId = query.studentId;
      return this.memorizationRepo.findAll(user.tenantId, filter, query.page ?? 1, query.limit ?? 20);
    }

    // ── SHEIKH: records they evaluated (evaluatedBy references User._id) ──
    if (roles.includes(Role.SHEIKH)) {
      filter.evaluatedById = user.sub; // user.sub IS a User ID — correct for evaluatedBy
      if (query.studentId) filter.studentId = query.studentId;
      return this.memorizationRepo.findAll(user.tenantId, filter, query.page ?? 1, query.limit ?? 20);
    }

    // ── STUDENT: own profile only ──────────────────────────────────────────
    if (roles.includes(Role.STUDENT)) {
      // user.sub is a User ID; resolve to Student profile ID.
      const profile = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!profile) return { items: [], total: 0 };
      filter.studentId = profile.id;
      return this.memorizationRepo.findAll(user.tenantId, filter, query.page ?? 1, query.limit ?? 20);
    }

    // ── PARENT: linked children only ──────────────────────────────────────
    if (roles.includes(Role.PARENT)) {
      const parent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!parent || parent.studentIds.length === 0) return { items: [], total: 0 };
      // If caller requests a specific child, verify the link.
      if (query.studentId) {
        if (!parent.studentIds.includes(query.studentId)) {
          throw new ForbiddenException('Parents may only access linked children.');
        }
        filter.studentId = query.studentId;
      } else {
        filter.studentIds = parent.studentIds;
      }
      return this.memorizationRepo.findAll(user.tenantId, filter, query.page ?? 1, query.limit ?? 20);
    }

    throw new ForbiddenException();
  }
}
