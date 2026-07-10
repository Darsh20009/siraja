export interface ParentRecord {
  id: string;
  userId: string;
  studentIds: string[];
  relationship?: string;
  receiveProgressReports: boolean;
}

export interface CreateParentInput {
  tenantId: string;
  userId: string;
  relationship?: string;
}

export interface UpdateParentInput {
  relationship?: string;
  receiveProgressReports?: boolean;
}

export interface IParentRepository {
  create(input: CreateParentInput): Promise<ParentRecord>;
  findByUserId(tenantId: string, userId: string): Promise<ParentRecord | null>;
  findById(tenantId: string, parentId: string): Promise<ParentRecord | null>;
  findAll(tenantId: string): Promise<ParentRecord[]>;
  update(tenantId: string, parentId: string, input: UpdateParentInput): Promise<ParentRecord>;
  /** Internal: add child link (called by StudentAssignmentsModule). */
  addChild(tenantId: string, parentId: string, studentId: string): Promise<void>;
  /** Internal: remove child link. */
  removeChild(tenantId: string, parentId: string, studentId: string): Promise<void>;
}

export const PARENT_REPOSITORY = Symbol('PARENT_REPOSITORY');
