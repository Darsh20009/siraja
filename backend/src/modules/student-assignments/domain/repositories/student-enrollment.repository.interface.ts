import { EnrollmentType } from '@shared/enums/enrollment-type.enum';

export interface StudentEnrollmentRecord {
  id: string;
  studentId: string;
  enrollmentType: EnrollmentType;
  circleId?: string | null;
  previousCircleId?: string | null;
  sheikhId?: string | null;
  assignedById: string;
  effectiveDate: Date;
  notes?: string;
  createdAt: Date;
}

export interface CreateEnrollmentInput {
  tenantId: string;
  studentId: string;
  enrollmentType: EnrollmentType;
  circleId?: string | null;
  previousCircleId?: string | null;
  sheikhId?: string | null;
  assignedById: string;
  effectiveDate?: Date;
  notes?: string;
}

export interface IStudentEnrollmentRepository {
  create(input: CreateEnrollmentInput): Promise<StudentEnrollmentRecord>;
  findHistoryForStudent(tenantId: string, studentId: string): Promise<StudentEnrollmentRecord[]>;
  findHistoryForCircle(tenantId: string, circleId: string, limit?: number): Promise<StudentEnrollmentRecord[]>;
}

export const STUDENT_ENROLLMENT_REPOSITORY = Symbol('STUDENT_ENROLLMENT_REPOSITORY');
