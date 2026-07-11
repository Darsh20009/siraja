import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { IAttendanceRepository, ATTENDANCE_REPOSITORY } from '@modules/attendance/domain/repositories/attendance.repository.interface';
import { IExamRepository, EXAM_REPOSITORY } from '@modules/exams/domain/repositories/exam.repository.interface';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '@modules/assignments/domain/repositories/assignment.repository.interface';
import { IAssessmentRepository, ASSESSMENT_REPOSITORY } from '@modules/assessments/domain/repositories/assessment.repository.interface';
import { IMemorizationRecordRepository, MEMORIZATION_RECORD_REPOSITORY } from '@modules/memorization/domain/repositories/memorization-record.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { Role } from '@shared/enums/roles.enum';

export interface StudentReportQuery {
  studentId: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * GetStudentReportUseCase
 *
 * Generates a comprehensive report for a single student covering:
 *   - Attendance rate & breakdown
 *   - Memorization progress
 *   - Exam performance
 *   - Assignment completion
 *   - Recent assessments
 *
 * RBAC:
 *   STUDENT      → own report only (matched by userId)
 *   PARENT       → linked children only (parent.studentIds must include studentId)
 *   SHEIKH       → only students in their circles or directly assigned to them; fails closed if profile missing
 *   SUPERVISOR   → any student in tenant
 *   TENANT_ADMIN → full tenant access
 */
@Injectable()
export class GetStudentReportUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepo: IAttendanceRepository,
    @Inject(EXAM_REPOSITORY)
    private readonly examRepo: IExamRepository,
    @Inject(ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: IAssignmentRepository,
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepo: IAssessmentRepository,
    @Inject(MEMORIZATION_RECORD_REPOSITORY)
    private readonly memorizationRepo: IMemorizationRecordRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, query: StudentReportQuery) {
    const student = await this.studentRepo.findById(user.tenantId, query.studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];

    // STUDENT: can only view own report
    if (roles.includes(Role.STUDENT) && !roles.includes(Role.TENANT_ADMIN)) {
      const self = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!self || self.id !== query.studentId) {
        throw new ForbiddenException('Students may only view their own report.');
      }
    }

    // PARENT: can only view linked children
    if (roles.includes(Role.PARENT) && !roles.includes(Role.TENANT_ADMIN)) {
      const parent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!parent) throw new ForbiddenException('Parent profile not found.');
      if (!parent.studentIds.includes(query.studentId)) {
        throw new ForbiddenException('Parents may only view reports for their linked children.');
      }
    }

    // SHEIKH: may only view reports for students in their assigned circles or directly assigned.
    // Fails closed when profile is missing.
    if (
      roles.includes(Role.SHEIKH) &&
      !roles.includes(Role.SUPERVISOR) &&
      !roles.includes(Role.TENANT_ADMIN)
    ) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');

      const inCircle = student.groupId != null && sheikh.groupIds.includes(student.groupId);
      const directlyAssigned = student.sheikhId === sheikh.id;
      if (!inCircle && !directlyAssigned) {
        throw new ForbiddenException('Sheikhs may only view reports for students in their circles.');
      }
    }

    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;

    const [attendanceRate, examPerformance, memorizationStats, assignments, assessments] =
      await Promise.all([
        this.attendanceRepo.getStudentAttendanceRate(user.tenantId, query.studentId, fromDate, toDate),
        this.examRepo.getStudentPerformance(user.tenantId, query.studentId, fromDate, toDate),
        this.memorizationRepo.getStudentStats(user.tenantId, query.studentId),
        this.assignmentRepo.findAll(user.tenantId, { studentId: query.studentId }, 1, 50),
        this.assessmentRepo.findAll(user.tenantId, { studentId: query.studentId, fromDate, toDate }, 1, 10),
      ]);

    const assignmentStats = {
      total: assignments.total,
      submitted: assignments.items.filter((a) => a.status === 'submitted' || a.status === 'reviewed').length,
      reviewed: assignments.items.filter((a) => a.status === 'reviewed').length,
      overdue: assignments.items.filter((a) => a.status === 'overdue').length,
      completionRate:
        assignments.total > 0
          ? Math.round(
              (assignments.items.filter((a) => a.status === 'submitted' || a.status === 'reviewed').length /
                assignments.total) *
                100,
            )
          : 0,
    };

    return {
      student: {
        id: student.id,
        userId: student.userId,
        groupId: student.groupId,
        sheikhId: student.sheikhId,
      },
      period: { fromDate, toDate },
      attendance: attendanceRate,
      memorization: {
        totalRecords: memorizationStats.total,
        completedRecords: memorizationStats.completed,
        totalAyahsMemorized: memorizationStats.totalAyahsMemorized,
      },
      exams: examPerformance,
      assignments: assignmentStats,
      recentAssessments: assessments.items,
    };
  }
}
