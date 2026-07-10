export interface CircleRecord {
  id: string;
  name: string;
  sheikhId?: string | null;
  studentIds: string[];
  targetJuzStart?: number;
  targetJuzEnd?: number;
  schedule?: string;
  isActive: boolean;
}

export interface CreateCircleInput {
  tenantId: string;
  name: string;
  sheikhId?: string;
  targetJuzStart?: number;
  targetJuzEnd?: number;
  schedule?: string;
}

export interface UpdateCircleInput {
  name?: string;
  sheikhId?: string | null;
  targetJuzStart?: number;
  targetJuzEnd?: number;
  schedule?: string;
  isActive?: boolean;
}

export interface ICircleRepository {
  create(input: CreateCircleInput): Promise<CircleRecord>;
  findById(tenantId: string, circleId: string): Promise<CircleRecord | null>;
  findAll(tenantId: string, filter?: { sheikhId?: string; isActive?: boolean }): Promise<CircleRecord[]>;
  findBySupervisor(tenantId: string, supervisorId: string): Promise<CircleRecord[]>;
  update(tenantId: string, circleId: string, input: UpdateCircleInput): Promise<CircleRecord>;
  remove(tenantId: string, circleId: string): Promise<void>;
  /** Internal: add student to circle's denormalized students array. */
  addStudent(tenantId: string, circleId: string, studentId: string): Promise<void>;
  /** Internal: remove student from circle's denormalized students array. */
  removeStudent(tenantId: string, circleId: string, studentId: string): Promise<void>;
}

export const CIRCLE_REPOSITORY = Symbol('CIRCLE_REPOSITORY');
