export interface SheikhRecord {
  id: string;
  userId: string;
  groupIds: string[];
  qualifications: string[];
  yearsOfExperience?: number;
  bio?: string;
  isActive: boolean;
}

export interface CreateSheikhInput {
  tenantId: string;
  userId: string;
  qualifications?: string[];
  yearsOfExperience?: number;
  bio?: string;
}

export interface UpdateSheikhInput {
  qualifications?: string[];
  yearsOfExperience?: number;
  bio?: string;
  isActive?: boolean;
}

export interface ISheikhRepository {
  create(input: CreateSheikhInput): Promise<SheikhRecord>;
  findByUserId(tenantId: string, userId: string): Promise<SheikhRecord | null>;
  findById(tenantId: string, sheikhId: string): Promise<SheikhRecord | null>;
  findAll(tenantId: string, filter?: { isActive?: boolean }): Promise<SheikhRecord[]>;
  update(tenantId: string, sheikhId: string, input: UpdateSheikhInput): Promise<SheikhRecord>;
  /** Internal: add circle to sheikh's groups list (called by CirclesModule). */
  addGroup(tenantId: string, sheikhId: string, groupId: string): Promise<void>;
  /** Internal: remove circle from sheikh's groups list. */
  removeGroup(tenantId: string, sheikhId: string, groupId: string): Promise<void>;
}

export const SHEIKH_REPOSITORY = Symbol('SHEIKH_REPOSITORY');
