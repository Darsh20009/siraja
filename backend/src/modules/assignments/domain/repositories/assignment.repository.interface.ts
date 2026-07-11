import { AssignmentStatus, AssignmentType } from '@shared/enums/exam-assignment.enum';

export interface AssignmentItem {
  id: string;
  studentId: string;
  groupId?: string;
  assignedById: string;
  type: AssignmentType;
  title: string;
  description?: string;
  status: AssignmentStatus;
  dueAt?: Date;
  submittedAt?: Date;
  submissionNotes?: string;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssignmentInput {
  tenantId: string;
  studentId: string;
  groupId?: string;
  assignedById: string;
  type: AssignmentType;
  title: string;
  description?: string;
  dueAt?: Date;
}

export interface UpdateAssignmentInput {
  title?: string;
  description?: string;
  dueAt?: Date;
  status?: AssignmentStatus;
}

export interface SubmitAssignmentInput {
  submittedAt: Date;
  submissionNotes?: string;
}

export interface ReviewAssignmentInput {
  feedback?: string;
  status: AssignmentStatus; // REVIEWED
}

export interface AssignmentListFilter {
  studentId?: string;
  studentIds?: string[];
  groupId?: string;
  assignedById?: string;
  type?: AssignmentType;
  status?: AssignmentStatus;
  fromDue?: Date;
  toDue?: Date;
}

export interface IAssignmentRepository {
  create(input: CreateAssignmentInput): Promise<AssignmentItem>;
  bulkCreate(inputs: CreateAssignmentInput[]): Promise<AssignmentItem[]>;
  findById(tenantId: string, id: string): Promise<AssignmentItem | null>;
  findAll(
    tenantId: string,
    filter: AssignmentListFilter,
    page?: number,
    limit?: number,
  ): Promise<{ items: AssignmentItem[]; total: number }>;
  update(tenantId: string, id: string, input: UpdateAssignmentInput): Promise<AssignmentItem>;
  submit(tenantId: string, id: string, input: SubmitAssignmentInput): Promise<AssignmentItem>;
  review(tenantId: string, id: string, input: ReviewAssignmentInput): Promise<AssignmentItem>;
  /** Mark overdue assignments for the tenant. Returns count updated. */
  markOverdue(tenantId: string): Promise<number>;
}

export const ASSIGNMENT_REPOSITORY = Symbol('ASSIGNMENT_REPOSITORY');
