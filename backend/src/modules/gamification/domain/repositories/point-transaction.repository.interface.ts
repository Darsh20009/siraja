import { PointTransactionDocument } from '@database/mongoose/schemas';
import { PointActivityType } from '@shared/enums/gamification.enum';

export const POINT_TRANSACTION_REPOSITORY = Symbol('POINT_TRANSACTION_REPOSITORY');

export interface CreatePointTransactionData {
  tenantId: string;
  studentId: string;
  activityType: PointActivityType;
  points: number;
  activityDate: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, unknown>;
}

export interface ITotalByActivity {
  activityType: PointActivityType;
  total: number;
}

export interface IPointTransactionRepository {
  create(data: CreatePointTransactionData): Promise<PointTransactionDocument>;
  findByStudent(tenantId: string, studentId: string, limit?: number): Promise<PointTransactionDocument[]>;
  sumByStudent(tenantId: string, studentId: string, fromDate?: string): Promise<number>;
  breakdownByActivity(tenantId: string, studentId: string): Promise<ITotalByActivity[]>;
  countByStudentAndActivity(tenantId: string, studentId: string, activityType: PointActivityType): Promise<number>;
}
