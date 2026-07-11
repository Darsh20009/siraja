import { ExamCategory, ExamResult, ExamStatus, ExamType } from '@shared/enums/exam-assignment.enum';
import { EvaluationGrade } from '@shared/enums/memorization.enum';

export interface ExamRangeInput {
  surahFrom: number;
  ayahFrom: number;
  surahTo: number;
  ayahTo: number;
}

export interface ExamItem {
  id: string;
  studentId: string;
  groupId?: string;
  examinerId?: string;
  category: ExamCategory;
  type: ExamType;
  status: ExamStatus;
  range?: ExamRangeInput;
  scheduledAt: Date;
  score?: number;
  grade?: EvaluationGrade;
  result: ExamResult;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExamInput {
  tenantId: string;
  studentId: string;
  groupId?: string;
  examinerId?: string;
  category: ExamCategory;
  type: ExamType;
  scheduledAt: Date;
  range?: ExamRangeInput;
  notes?: string;
}

export interface UpdateExamInput {
  status?: ExamStatus;
  examinerId?: string;
  scheduledAt?: Date;
  notes?: string;
}

export interface GradeExamInput {
  score: number;
  grade?: EvaluationGrade;
  result: ExamResult;
  notes?: string;
}

export interface ExamListFilter {
  studentId?: string;
  studentIds?: string[];
  groupId?: string;
  examinerId?: string;
  category?: ExamCategory;
  status?: ExamStatus;
  result?: ExamResult;
  fromDate?: Date;
  toDate?: Date;
}

export interface ExamPerformanceStat {
  total: number;
  graded: number;
  passed: number;
  failed: number;
  averageScore: number;
  passRate: number; // 0–100 percentage
}

export interface IExamRepository {
  create(input: CreateExamInput): Promise<ExamItem>;
  findById(tenantId: string, id: string): Promise<ExamItem | null>;
  findAll(
    tenantId: string,
    filter: ExamListFilter,
    page?: number,
    limit?: number,
  ): Promise<{ items: ExamItem[]; total: number }>;
  update(tenantId: string, id: string, input: UpdateExamInput): Promise<ExamItem>;
  grade(tenantId: string, id: string, input: GradeExamInput): Promise<ExamItem>;
  getStudentPerformance(tenantId: string, studentId: string, fromDate?: Date, toDate?: Date): Promise<ExamPerformanceStat>;
  getGroupPerformance(tenantId: string, groupId: string, fromDate?: Date, toDate?: Date): Promise<ExamPerformanceStat>;
}

export const EXAM_REPOSITORY = Symbol('EXAM_REPOSITORY');
