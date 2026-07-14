export interface StudentProgressReportJob {
  tenantId: string;
  studentId: string;
  requestedBy: string;
  periodDays: number;
}

export interface CircleSummaryReportJob {
  tenantId: string;
  circleId: string;
  requestedBy: string;
  periodDays: number;
}

export interface AttendanceReportJob {
  tenantId: string;
  requestedBy: string;
  entityType: 'circle' | 'academy' | 'student';
  entityId: string;
  fromDate: string;
  toDate: string;
}
