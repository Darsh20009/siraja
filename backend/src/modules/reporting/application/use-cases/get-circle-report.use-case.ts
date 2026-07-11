import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { IAttendanceRepository, ATTENDANCE_REPOSITORY } from '@modules/attendance/domain/repositories/attendance.repository.interface';
import { IExamRepository, EXAM_REPOSITORY } from '@modules/exams/domain/repositories/exam.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '@modules/assignments/domain/repositories/assignment.repository.interface';
import { IMemorizationRecordRepository, MEMORIZATION_RECORD_REPOSITORY } from '@modules/memorization/domain/repositories/memorization-record.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { Role } from '@shared/enums/roles.enum';

export interface CircleReportQuery {
  groupId: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * GetCircleReportUseCase
 *
 * Circle-level aggregate report:
 *   - Total enrolled students
 *   - Group attendance rate
 *   - Exam performance
 *   - Assignment completion
 *   - Per-student memorization stats for ranking
 *
 * RBAC: REPORTS.READ (Sheikh for own circles, Supervisor, Tenant Admin).
 */
@Injectable()
export class GetCircleReportUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepo: IAttendanceRepository,
    @Inject(EXAM_REPOSITORY)
    private readonly examRepo: IExamRepository,
    @Inject(ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: IAssignmentRepository,
    @Inject(MEMORIZATION_RECORD_REPOSITORY)
    private readonly memorizationRepo: IMemorizationRecordRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, query: CircleReportQuery) {
    const roles = user.roles as Role[];

    // SHEIKH: may only view reports for circles they manage.
    if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN) && !roles.includes(Role.SUPERVISOR)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');
      if (!sheikh.groupIds.includes(query.groupId)) {
        throw new ForbiddenException('Sheikhs may only view reports for their own circles.');
      }
    }

    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;

    // Fetch enrolled students using the circle-scoped method
    const studentList = await this.studentRepo.findByCircle(user.tenantId, query.groupId);

    if (studentList.length === 0) {
      return {
        groupId: query.groupId,
        period: { fromDate, toDate },
        totalStudents: 0,
        attendance: { total: 0, present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0 },
        exams: { total: 0, graded: 0, passed: 0, failed: 0, averageScore: 0, passRate: 0 },
        assignments: { total: 0 },
        studentRankings: [],
      };
    }

    const [attendance, exams, assignments] = await Promise.all([
      this.attendanceRepo.getGroupAttendanceRate(user.tenantId, query.groupId, fromDate, toDate),
      this.examRepo.getGroupPerformance(user.tenantId, query.groupId, fromDate, toDate),
      this.assignmentRepo.findAll(user.tenantId, { groupId: query.groupId }, 1, 1),
    ]);

    // Per-student memorization stats for ranking
    const studentRankings = await Promise.all(
      studentList.map(async (s) => {
        const stats = await this.memorizationRepo.getStudentStats(user.tenantId, s.id);
        return {
          studentId: s.id,
          totalAyahsMemorized: stats.totalAyahsMemorized,
          completedRecords: stats.completed,
        };
      }),
    );

    studentRankings.sort((a, b) => b.totalAyahsMemorized - a.totalAyahsMemorized);

    return {
      groupId: query.groupId,
      period: { fromDate, toDate },
      totalStudents: studentList.length,
      attendance,
      exams,
      assignments: { total: assignments.total },
      studentRankings,
    };
  }
}
