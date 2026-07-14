import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_REPORT, JOB_REPORT_STUDENT_PROGRESS, JOB_REPORT_CIRCLE_SUMMARY, JOB_REPORT_ATTENDANCE } from '../queue.constants';
import type { StudentProgressReportJob, CircleSummaryReportJob, AttendanceReportJob } from '../jobs/report.jobs';

@Processor(QUEUE_REPORT)
export class ReportQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportQueueProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing report job ${job.name} [${job.id}]`);

    switch (job.name) {
      case JOB_REPORT_STUDENT_PROGRESS:
        return this.handleStudentProgress(job.data as StudentProgressReportJob);
      case JOB_REPORT_CIRCLE_SUMMARY:
        return this.handleCircleSummary(job.data as CircleSummaryReportJob);
      case JOB_REPORT_ATTENDANCE:
        return this.handleAttendance(job.data as AttendanceReportJob);
      default:
        this.logger.warn(`Unknown report job: ${job.name}`);
    }
  }

  private async handleStudentProgress(data: StudentProgressReportJob): Promise<void> {
    this.logger.log(
      `[Report] Student progress: tenant=${data.tenantId} student=${data.studentId} ` +
        `period=${data.periodDays}d requestedBy=${data.requestedBy}`,
    );
  }

  private async handleCircleSummary(data: CircleSummaryReportJob): Promise<void> {
    this.logger.log(
      `[Report] Circle summary: tenant=${data.tenantId} circle=${data.circleId}`,
    );
  }

  private async handleAttendance(data: AttendanceReportJob): Promise<void> {
    this.logger.log(
      `[Report] Attendance: tenant=${data.tenantId} ${data.entityType}=${data.entityId} ` +
        `${data.fromDate}→${data.toDate}`,
    );
  }
}
