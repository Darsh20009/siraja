import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ATTENDANCE_REPOSITORY, IAttendanceRepository } from '../../domain/repositories/attendance.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * GetAttendanceUseCase
 *
 * Fetches a single record and enforces per-instance ownership checks to
 * prevent IDOR — mirrors the established Phase 7 pattern.
 *
 * Ownership rules:
 *   TENANT_ADMIN / SUPERVISOR → unrestricted within tenant
 *   SHEIKH     → record must belong to one of their circles (groupId in sheikh.groupIds)
 *                OR they personally recorded it (sheikhId === user.sub)
 *   PARENT     → record's studentId must be in parent.studentIds
 *   STUDENT    → record's studentId must match their own profile id
 */
@Injectable()
export class GetAttendanceUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepo: IAttendanceRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, id: string) {
    const record = await this.attendanceRepo.findById(user.tenantId, id);
    if (!record) throw new NotFoundException('Attendance record not found.');

    const roles = user.roles as Role[];

    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      return record;
    }

    if (roles.includes(Role.SHEIKH)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');

      const inCircle = record.groupId != null && sheikh.groupIds.includes(record.groupId);
      const recorded = record.sheikhId === user.sub; // sheikhId stores User ObjectId
      if (!inCircle && !recorded) {
        throw new ForbiddenException('Sheikhs may only access attendance records for their circles.');
      }
      return record;
    }

    if (roles.includes(Role.PARENT)) {
      const parent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!parent || !parent.studentIds.includes(record.studentId)) {
        throw new ForbiddenException("Parents may only access their linked children's records.");
      }
      return record;
    }

    if (roles.includes(Role.STUDENT)) {
      const profile = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!profile || profile.id !== record.studentId) {
        throw new ForbiddenException('Students may only access their own attendance records.');
      }
      return record;
    }

    throw new ForbiddenException();
  }
}
