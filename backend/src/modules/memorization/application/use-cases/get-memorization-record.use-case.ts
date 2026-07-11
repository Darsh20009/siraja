import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  IMemorizationRecordRepository,
  MEMORIZATION_RECORD_REPOSITORY,
} from '../../domain/repositories/memorization-record.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * GetMemorizationRecordUseCase
 *
 * Fetches a single record and enforces per-instance ownership checks to
 * prevent IDOR — mirrors the pattern in GetStudentUseCase.
 */
@Injectable()
export class GetMemorizationRecordUseCase {
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

  async execute(user: AccessTokenPayload, id: string) {
    const record = await this.memorizationRepo.findById(user.tenantId, id);
    if (!record) throw new NotFoundException('Memorization record not found.');

    const roles = user.roles as Role[];

    // TENANT_ADMIN / SUPERVISOR: unrestricted within tenant.
    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      return record;
    }

    // SHEIKH: may only see records they personally evaluated.
    // evaluatedBy references User._id, so comparing to user.sub (User ID) is correct.
    if (roles.includes(Role.SHEIKH)) {
      if (record.evaluatedById !== user.sub) {
        throw new ForbiddenException('Sheikhs may only access records they evaluated.');
      }
      return record;
    }

    // STUDENT: may only see own records.
    // record.studentId is a Student profile ID; resolve from user.sub (User ID).
    if (roles.includes(Role.STUDENT)) {
      const profile = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!profile || profile.id !== record.studentId) {
        throw new ForbiddenException('Students may only access their own records.');
      }
      return record;
    }

    // PARENT: may only see records for linked children.
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
