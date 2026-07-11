import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ATTENDANCE_REPOSITORY, AttendanceListFilter, IAttendanceRepository } from '../../domain/repositories/attendance.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';
import { AttendanceStatus } from '@shared/enums/attendance-status.enum';

export interface ListAttendanceQuery {
  sessionId?: string;
  studentId?: string;
  groupId?: string;
  status?: AttendanceStatus;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
}

/**
 * ListAttendanceUseCase
 *
 * Role-scoped listing:
 *  - STUDENT    → own records only
 *  - PARENT     → linked children only
 *  - SHEIKH     → their assigned circles only
 *  - SUPERVISOR → all groups in tenant (filter by groupId)
 *  - ADMIN      → full tenant access
 */
@Injectable()
export class ListAttendanceUseCase {
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

  async execute(user: AccessTokenPayload, query: ListAttendanceQuery) {
    const roles = user.roles as Role[];
    const filter: AttendanceListFilter = {
      sessionId: query.sessionId,
      groupId: query.groupId,
      status: query.status,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
    };

    if (roles.includes(Role.STUDENT)) {
      const student = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!student) throw new ForbiddenException('Student profile not found.');
      filter.studentId = student.id;
    } else if (roles.includes(Role.PARENT) && !roles.includes(Role.TENANT_ADMIN)) {
      const parent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!parent) throw new ForbiddenException('Parent profile not found.');
      filter.studentIds = parent.studentIds;
    } else if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');
      // attendance.sheikh stores the User ObjectId — filter by userId, not sheikh profile id
      filter.sheikhId = sheikh.userId;
    } else if (query.studentId) {
      filter.studentId = query.studentId;
    }

    return this.attendanceRepo.findAll(user.tenantId, filter, query.page, query.limit);
  }
}
