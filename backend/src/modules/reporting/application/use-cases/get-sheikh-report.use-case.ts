import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IAttendanceRepository, ATTENDANCE_REPOSITORY } from '@modules/attendance/domain/repositories/attendance.repository.interface';
import { IExamRepository, EXAM_REPOSITORY } from '@modules/exams/domain/repositories/exam.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '@modules/assignments/domain/repositories/assignment.repository.interface';
import { Role } from '@shared/enums/roles.enum';

export interface SheikhReportQuery {
  sheikhId: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * GetSheikhReportUseCase
 *
 * Summary report for a sheikh covering their assigned circles:
 *   - Total students managed
 *   - Aggregate attendance rate across their circles
 *   - Exam performance of their students
 *   - Assignment review statistics
 *
 * RBAC:
 *   SHEIKH       → own report only
 *   SUPERVISOR   → any sheikh
 *   TENANT_ADMIN → full access
 */
@Injectable()
export class GetSheikhReportUseCase {
  constructor(
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepo: IAttendanceRepository,
    @Inject(EXAM_REPOSITORY)
    private readonly examRepo: IExamRepository,
    @Inject(ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: IAssignmentRepository,
  ) {}

  async execute(user: AccessTokenPayload, query: SheikhReportQuery) {
    const sheikh = await this.sheikhRepo.findById(user.tenantId, query.sheikhId);
    if (!sheikh) throw new NotFoundException('Sheikh not found.');

    const roles = user.roles as Role[];
    if (
      roles.includes(Role.SHEIKH) &&
      !roles.includes(Role.SUPERVISOR) &&
      !roles.includes(Role.TENANT_ADMIN)
    ) {
      if (sheikh.userId !== user.sub) {
        throw new ForbiddenException('Sheikhs may only view their own report.');
      }
    }

    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;

    // Aggregate stats across all circles managed by this sheikh
    const circleReports = await Promise.all(
      (sheikh.groupIds ?? []).map(async (groupId) => {
        const [attendance, exams] = await Promise.all([
          this.attendanceRepo.getGroupAttendanceRate(user.tenantId, groupId, fromDate, toDate),
          this.examRepo.getGroupPerformance(user.tenantId, groupId, fromDate, toDate),
        ]);
        return { groupId, attendance, exams };
      }),
    );

    const [assignments] = await Promise.all([
      this.assignmentRepo.findAll(user.tenantId, { assignedById: sheikh.userId }, 1, 1),
    ]);

    return {
      sheikh: {
        id: sheikh.id,
        userId: sheikh.userId,
        groupIds: sheikh.groupIds,
      },
      period: { fromDate, toDate },
      circles: circleReports,
      assignmentsIssued: assignments.total,
    };
  }
}
