export interface SupervisorRecord {
  id: string;
  userId: string;
  supervisedGroupIds: string[];
  department?: string;
  isActive: boolean;
}

export interface CreateSupervisorInput {
  tenantId: string;
  userId: string;
  department?: string;
}

export interface UpdateSupervisorInput {
  department?: string;
  isActive?: boolean;
}

export interface ISupervisorRepository {
  create(input: CreateSupervisorInput): Promise<SupervisorRecord>;
  findByUserId(tenantId: string, userId: string): Promise<SupervisorRecord | null>;
  findById(tenantId: string, supervisorId: string): Promise<SupervisorRecord | null>;
  findAll(tenantId: string, filter?: { isActive?: boolean }): Promise<SupervisorRecord[]>;
  update(tenantId: string, supervisorId: string, input: UpdateSupervisorInput): Promise<SupervisorRecord>;
  /** Internal: add a circle to supervisor's managed list (called by CirclesModule). */
  addGroup(tenantId: string, supervisorId: string, groupId: string): Promise<void>;
  /** Internal: remove a circle from supervisor's managed list. */
  removeGroup(tenantId: string, supervisorId: string, groupId: string): Promise<void>;
}

export const SUPERVISOR_REPOSITORY = Symbol('SUPERVISOR_REPOSITORY');
