export interface CircleRecord {
  id: string;
  name: string;
  description?: string;
  capacity?: number;
  sheikhId?: string | null;
  supervisorId?: string | null;
  studentIds: string[];
  targetJuzStart?: number;
  targetJuzEnd?: number;
  schedule?: string;
  isActive: boolean;
}

export interface CreateCircleInput {
  tenantId: string;
  name: string;
  description?: string;
  capacity?: number;
  sheikhId?: string;
  supervisorId?: string;
  targetJuzStart?: number;
  targetJuzEnd?: number;
  schedule?: string;
}

export interface UpdateCircleInput {
  name?: string;
  description?: string;
  capacity?: number;
  targetJuzStart?: number;
  targetJuzEnd?: number;
  schedule?: string;
  isActive?: boolean;
}

export interface ICircleRepository {
  create(input: CreateCircleInput): Promise<CircleRecord>;
  findById(tenantId: string, circleId: string): Promise<CircleRecord | null>;
  findAll(tenantId: string, filter?: { sheikhId?: string; supervisorId?: string; isActive?: boolean }): Promise<CircleRecord[]>;
  findBySupervisor(tenantId: string, supervisorId: string): Promise<CircleRecord[]>;
  update(tenantId: string, circleId: string, input: UpdateCircleInput): Promise<CircleRecord>;
  /** Set the assigned sheikh (null to unassign). Called by CirclesModule assignment use-cases. */
  setSheikh(tenantId: string, circleId: string, sheikhId: string | null): Promise<void>;
  /** Set the assigned supervisor (null to unassign). Called by CirclesModule assignment use-cases. */
  setSupervisor(tenantId: string, circleId: string, supervisorId: string | null): Promise<void>;
  remove(tenantId: string, circleId: string): Promise<void>;
  /** Internal: add student to circle's denormalized students array. */
  addStudent(tenantId: string, circleId: string, studentId: string): Promise<void>;
  /** Internal: remove student from circle's denormalized students array. */
  removeStudent(tenantId: string, circleId: string, studentId: string): Promise<void>;
}

export const CIRCLE_REPOSITORY = Symbol('CIRCLE_REPOSITORY');
