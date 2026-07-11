import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  IQuranMistakeRepository,
  MistakeListFilter,
  QURAN_MISTAKE_REPOSITORY,
} from '../../domain/repositories/quran-mistake.repository.interface';
import { MistakeResolutionStatus, MistakeSeverity, MistakeType } from '@shared/enums/memorization.enum';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';

export interface ListMistakesQuery {
  studentId?: string;
  memorizationRecordId?: string;
  reviewRecordId?: string;
  type?: MistakeType;
  severity?: MistakeSeverity;
  resolutionStatus?: MistakeResolutionStatus;
  surahNumber?: number;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListMistakesUseCase {
  constructor(
    @Inject(QURAN_MISTAKE_REPOSITORY)
    private readonly mistakeRepo: IQuranMistakeRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, query: ListMistakesQuery) {
    const roles = user.roles as Role[];
    const filter: MistakeListFilter = {};

    if (query.memorizationRecordId) filter.memorizationRecordId = query.memorizationRecordId;
    if (query.reviewRecordId) filter.reviewRecordId = query.reviewRecordId;
    if (query.type) filter.type = query.type;
    if (query.severity) filter.severity = query.severity;
    if (query.resolutionStatus) filter.resolutionStatus = query.resolutionStatus;
    if (query.surahNumber) filter.surahNumber = query.surahNumber;

    // TENANT_ADMIN / SUPERVISOR: unrestricted.
    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      if (query.studentId) filter.studentId = query.studentId;
      return this.mistakeRepo.findAll(user.tenantId, filter, query.page ?? 1, query.limit ?? 50);
    }

    // SHEIKH: only mistakes for their accessible students.
    if (roles.includes(Role.SHEIKH)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) return { items: [], total: 0 };
      // Get all students accessible to this sheikh.
      const students = await this.studentRepo.findBySheikh(user.tenantId, sheikh.id, sheikh.groupIds);
      const accessibleIds = students.map((s) => s.id);
      if (accessibleIds.length === 0) return { items: [], total: 0 };
      // If a specific student was requested, verify access.
      if (query.studentId) {
        if (!accessibleIds.includes(query.studentId)) {
          throw new ForbiddenException('Sheikhs may only access their assigned students.');
        }
        filter.studentId = query.studentId;
      } else {
        filter.studentIds = accessibleIds;
      }
      return this.mistakeRepo.findAll(user.tenantId, filter, query.page ?? 1, query.limit ?? 50);
    }

    // STUDENT: own mistakes only — resolve User ID → Student profile ID.
    if (roles.includes(Role.STUDENT)) {
      const profile = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!profile) return { items: [], total: 0 };
      filter.studentId = profile.id;
      return this.mistakeRepo.findAll(user.tenantId, filter, query.page ?? 1, query.limit ?? 50);
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
      return this.mistakeRepo.findAll(user.tenantId, filter, query.page ?? 1, query.limit ?? 50);
    }

    throw new ForbiddenException();
  }
}
