import { Module } from '@nestjs/common';
import { GetStudentReportUseCase } from './application/use-cases/get-student-report.use-case';
import { GetParentReportUseCase } from './application/use-cases/get-parent-report.use-case';
import { GetSheikhReportUseCase } from './application/use-cases/get-sheikh-report.use-case';
import { GetCircleReportUseCase } from './application/use-cases/get-circle-report.use-case';
import { GetSupervisorReportUseCase } from './application/use-cases/get-supervisor-report.use-case';
import { ReportingController } from './infrastructure/controllers/reporting.controller';
import { StudentsModule } from '@modules/students/students.module';
import { ParentsModule } from '@modules/parents/parents.module';
import { SheikhsModule } from '@modules/sheikhs/sheikhs.module';
import { SupervisorsModule } from '@modules/supervisors/supervisors.module';
import { AttendanceModule } from '@modules/attendance/attendance.module';
import { ExamsModule } from '@modules/exams/exams.module';
import { AssignmentsModule } from '@modules/assignments/assignments.module';
import { AssessmentsModule } from '@modules/assessments/assessments.module';
import { MemorizationModule } from '@modules/memorization/memorization.module';

/**
 * Reporting Module — Phase 8.
 *
 * Cross-cutting analytics layer that aggregates data from Attendance,
 * Exams, Assignments, Assessments, and Memorization modules into
 * role-scoped reports for Students, Parents, Sheikhs, Circles, and Supervisors.
 *
 * This module does NOT own any collections — it imports repositories from
 * the operational modules above and performs read-only aggregations.
 *
 * Analytics provided:
 *   - Attendance rate (per student, per circle)
 *   - Memorization progress (ayahs memorized, completed records)
 *   - Exam performance (pass rate, average score)
 *   - Assignment completion rate
 *   - Student ranking within a circle
 *   - Circle ranking for supervisors
 */
@Module({
  imports: [
    StudentsModule,
    ParentsModule,
    SheikhsModule,
    SupervisorsModule,
    AttendanceModule,
    ExamsModule,
    AssignmentsModule,
    AssessmentsModule,
    MemorizationModule,
  ],
  controllers: [ReportingController],
  providers: [
    GetStudentReportUseCase,
    GetParentReportUseCase,
    GetSheikhReportUseCase,
    GetCircleReportUseCase,
    GetSupervisorReportUseCase,
  ],
})
export class ReportingModule {}
