import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { IAttendanceRepository, ATTENDANCE_REPOSITORY } from '@modules/attendance/domain/repositories/attendance.repository.interface';
import { IExamRepository, EXAM_REPOSITORY } from '@modules/exams/domain/repositories/exam.repository.interface';
import { Role } from '@shared/enums/roles.enum';

export interface ParentReportQuery {
  parentId: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * GetParentReportUseCase
 *
 * Aggregates a summary report for all children linked to a parent.
 * Each child card shows attendance rate and exam performance.
 *
 * RBAC:
 *   PARENT       → own report only (matched by userId)
 *   TENANT_ADMIN → any parent
 */
@Injectable()
export class GetParentReportUseCase {
  constructor(
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepo: IAttendanceRepository,
    @Inject(EXAM_REPOSITORY)
    private readonly examRepo: IExamRepository,
  ) {}

  async execute(user: AccessTokenPayload, query: ParentReportQuery) {
    const parent = await this.parentRepo.findById(user.tenantId, query.parentId);
    if (!parent) throw new NotFoundException('Parent not found.');

    const roles = user.roles as Role[];
    if (roles.includes(Role.PARENT) && !roles.includes(Role.TENANT_ADMIN)) {
      if (parent.userId !== user.sub) {
        throw new ForbiddenException('Parents may only view their own report.');
      }
    }

    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;

    const childReports = await Promise.all(
      parent.studentIds.map(async (studentId) => {
        const student = await this.studentRepo.findById(user.tenantId, studentId);
        if (!student) return null;
        const [attendance, exams] = await Promise.all([
          this.attendanceRepo.getStudentAttendanceRate(user.tenantId, studentId, fromDate, toDate),
          this.examRepo.getStudentPerformance(user.tenantId, studentId, fromDate, toDate),
        ]);
        return { student: { id: student.id, userId: student.userId }, attendance, exams };
      }),
    );

    return {
      parent: { id: parent.id, userId: parent.userId, childIds: parent.studentIds },
      period: { fromDate, toDate },
      children: childReports.filter(Boolean),
    };
  }
}
