import { AssessmentStatus, AssessmentType } from '@shared/enums/exam-assignment.enum';
import { EvaluationGrade } from '@shared/enums/memorization.enum';

export interface AssessmentItem {
  id: string;
  studentId: string;
  groupId?: string;
  assessedById: string;
  type: AssessmentType;
  status: AssessmentStatus;
  periodStart: Date;
  periodEnd: Date;
  score?: number;
  grade?: EvaluationGrade;
  title?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssessmentInput {
  tenantId: string;
  studentId: string;
  groupId?: string;
  assessedById: string;
  type: AssessmentType;
  periodStart: Date;
  periodEnd: Date;
  score?: number;
  grade?: EvaluationGrade;
  title?: string;
  notes?: string;
}

export interface UpdateAssessmentInput {
  score?: number;
  grade?: EvaluationGrade;
  title?: string;
  notes?: string;
  status?: AssessmentStatus;
}

export interface AssessmentListFilter {
  studentId?: string;
  studentIds?: string[];
  groupId?: string;
  assessedById?: string;
  type?: AssessmentType;
  status?: AssessmentStatus;
  fromDate?: Date;
  toDate?: Date;
}

export interface IAssessmentRepository {
  create(input: CreateAssessmentInput): Promise<AssessmentItem>;
  findById(tenantId: string, id: string): Promise<AssessmentItem | null>;
  findAll(
    tenantId: string,
    filter: AssessmentListFilter,
    page?: number,
    limit?: number,
  ): Promise<{ items: AssessmentItem[]; total: number }>;
  update(tenantId: string, id: string, input: UpdateAssessmentInput): Promise<AssessmentItem>;
}

export const ASSESSMENT_REPOSITORY = Symbol('ASSESSMENT_REPOSITORY');
