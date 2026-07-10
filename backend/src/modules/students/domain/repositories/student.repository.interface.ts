import { MemorizationStatus } from '@shared/enums/memorization.enum';

export interface StudentRecord {
  id: string;
  userId: string;
  groupId?: string | null;
  sheikhId?: string | null;
  parentIds: string[];
  dateOfBirth?: Date;
  enrolledAt: Date;
  currentMemorizationStatus?: MemorizationStatus;
  currentJuzNumber?: number;
  isActive: boolean;
  notes?: string;
}

export interface CreateStudentInput {
  tenantId: string;
  userId: string;
  dateOfBirth?: Date;
  notes?: string;
}

export interface UpdateStudentInput {
  dateOfBirth?: Date;
  currentJuzNumber?: number;
  currentMemorizationStatus?: MemorizationStatus;
  isActive?: boolean;
  notes?: string;
}

export interface IStudentRepository {
  create(input: CreateStudentInput): Promise<StudentRecord>;
  findByUserId(tenantId: string, userId: string): Promise<StudentRecord | null>;
  findById(tenantId: string, studentId: string): Promise<StudentRecord | null>;
  findAll(tenantId: string, filter?: { isActive?: boolean; groupId?: string; sheikhId?: string }): Promise<StudentRecord[]>;
  findByCircle(tenantId: string, groupId: string): Promise<StudentRecord[]>;
  findByParent(tenantId: string, parentId: string): Promise<StudentRecord[]>;
  findBySheikh(tenantId: string, sheikhId: string): Promise<StudentRecord[]>;
  update(tenantId: string, studentId: string, input: UpdateStudentInput): Promise<StudentRecord>;
  /** Soft-delete. */
  remove(tenantId: string, studentId: string): Promise<void>;
  /** Internal: set group (called by StudentAssignmentsModule). */
  setGroup(tenantId: string, studentId: string, groupId: string | null): Promise<void>;
  /** Internal: set direct sheikh (called by StudentAssignmentsModule). */
  setSheikh(tenantId: string, studentId: string, sheikhId: string | null): Promise<void>;
}

export const STUDENT_REPOSITORY = Symbol('STUDENT_REPOSITORY');
