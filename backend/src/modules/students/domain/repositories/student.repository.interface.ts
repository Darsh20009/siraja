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
  /**
   * Returns students directly assigned to this sheikh AND students in the
   * sheikh's circles. `circleIds` should be the sheikh's `groupIds` from
   * their SheikhRecord — the caller resolves them so the repository stays
   * single-model (no cross-schema join needed).
   */
  findBySheikh(tenantId: string, sheikhId: string, circleIds?: string[]): Promise<StudentRecord[]>;
  update(tenantId: string, studentId: string, input: UpdateStudentInput): Promise<StudentRecord>;
  /** Soft-delete. */
  remove(tenantId: string, studentId: string): Promise<void>;
  /** Internal: set group (called by StudentAssignmentsModule). */
  setGroup(tenantId: string, studentId: string, groupId: string | null): Promise<void>;
  /** Internal: set direct sheikh (called by StudentAssignmentsModule). */
  setSheikh(tenantId: string, studentId: string, sheikhId: string | null): Promise<void>;
  /** Internal: add parent link — syncs the inverse side of Parent.students. */
  addParent?(tenantId: string, studentId: string, parentId: string): Promise<void>;
  /** Internal: remove parent link. */
  removeParent?(tenantId: string, studentId: string, parentId: string): Promise<void>;
}

export const STUDENT_REPOSITORY = Symbol('STUDENT_REPOSITORY');
