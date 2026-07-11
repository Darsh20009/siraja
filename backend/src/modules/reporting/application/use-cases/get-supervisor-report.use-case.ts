import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ISupervisorRepository, SUPERVISOR_REPOSITORY } from '@modules/supervisors/domain/repositories/supervisor.repository.interface';
import { IAttendanceRepository, ATTENDANCE_REPOSITORY } from '@modules/attendance/domain/repositories/attendance.repository.interface';
import { IExamRepository, EXAM_REPOSITORY } from '@modules/exams/domain/repositories/exam.repository.interface';
import { Role } from '@shared/enums/roles.enum';

export interface SupervisorReportQuery {
  supervisorId: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * GetSupervisorReportUseCase
 *
 * Supervisor-level report covering all supervised circles:
 *   - Per-circle attendance rate
 *   - Per-circle exam performance
 *   - Circle ranking by attendance rate
 *
 * RBAC:
 *   SUPERVISOR   → own report only
 *   TENANT_ADMIN → any supervisor
 */
@Injectable()
export class GetSupervisorReportUseCase {
  constructor(
    @Inject(SUPERVISOR_REPOSITORY)
    private readonly supervisorRepo: ISupervisorRepository,
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepo: IAttendanceRepository,
    @Inject(EXAM_REPOSITORY)
    private readonly examRepo: IExamRepository,
  ) {}

  async execute(user: AccessTokenPayload, query: SupervisorReportQuery) {
    const supervisor = await this.supervisorRepo.findById(user.tenantId, query.supervisorId);
    if (!supervisor) throw new NotFoundException('Supervisor not found.');

    const roles = user.roles as Role[];
    if (roles.includes(Role.SUPERVISOR) && !roles.includes(Role.TENANT_ADMIN)) {
      if (supervisor.userId !== user.sub) {
        throw new ForbiddenException('Supervisors may only view their own report.');
      }
    }

    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;

    const circleReports = await Promise.all(
      (supervisor.supervisedGroupIds ?? []).map(async (groupId) => {
        const [attendance, exams] = await Promise.all([
          this.attendanceRepo.getGroupAttendanceRate(user.tenantId, groupId, fromDate, toDate),
          this.examRepo.getGroupPerformance(user.tenantId, groupId, fromDate, toDate),
        ]);
        return { groupId, attendance, exams };
      }),
    );

    // Circle ranking: sorted by attendance rate (desc)
    const circleRanking = [...circleReports].sort(
      (a, b) => b.attendance.attendanceRate - a.attendance.attendanceRate,
    );

    return {
      supervisor: {
        id: supervisor.id,
        userId: supervisor.userId,
        groupIds: supervisor.supervisedGroupIds,
      },
      period: { fromDate, toDate },
      totalCircles: (supervisor.supervisedGroupIds ?? []).length,
      circles: circleReports,
      circleRanking: circleRanking.map((c) => ({
        groupId: c.groupId,
        attendanceRate: c.attendance.attendanceRate,
        examPassRate: c.exams.passRate,
      })),
    };
  }
}
