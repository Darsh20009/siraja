import { AttendanceStatus } from '@shared/enums/attendance-status.enum';

export interface AttendanceItem {
  id: string;
  sessionId?: string;
  studentId: string;
  groupId?: string;
  sheikhId?: string;
  status: AttendanceStatus;
  date: Date;
  checkedInAt?: Date;
  recordedById?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAttendanceInput {
  tenantId: string;
  sessionId?: string;
  studentId: string;
  groupId?: string;
  sheikhId?: string;
  status: AttendanceStatus;
  date: Date;
  checkedInAt?: Date;
  recordedById?: string;
  notes?: string;
}

export interface UpdateAttendanceInput {
  status?: AttendanceStatus;
  checkedInAt?: Date;
  notes?: string;
}

export interface AttendanceListFilter {
  sessionId?: string;
  studentId?: string;
  studentIds?: string[];
  groupId?: string;
  sheikhId?: string;
  status?: AttendanceStatus;
  fromDate?: Date;
  toDate?: Date;
}

export interface AttendanceRateStat {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number; // 0–100 percentage
}

export interface IAttendanceRepository {
  create(input: CreateAttendanceInput): Promise<AttendanceItem>;
  bulkCreate(inputs: CreateAttendanceInput[]): Promise<AttendanceItem[]>;
  findById(tenantId: string, id: string): Promise<AttendanceItem | null>;
  findAll(
    tenantId: string,
    filter: AttendanceListFilter,
    page?: number,
    limit?: number,
  ): Promise<{ items: AttendanceItem[]; total: number }>;
  update(tenantId: string, id: string, input: UpdateAttendanceInput): Promise<AttendanceItem>;
  getStudentAttendanceRate(tenantId: string, studentId: string, fromDate?: Date, toDate?: Date): Promise<AttendanceRateStat>;
  getGroupAttendanceRate(tenantId: string, groupId: string, fromDate?: Date, toDate?: Date): Promise<AttendanceRateStat>;
}

export const ATTENDANCE_REPOSITORY = Symbol('ATTENDANCE_REPOSITORY');
