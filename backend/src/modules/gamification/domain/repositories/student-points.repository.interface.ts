import { StudentPointsDocument } from '@database/mongoose/schemas';
import { PointActivityType } from '@shared/enums/gamification.enum';

export const STUDENT_POINTS_REPOSITORY = Symbol('STUDENT_POINTS_REPOSITORY');

export interface IStudentPointsRepository {
  findByStudent(tenantId: string, studentId: string): Promise<StudentPointsDocument | null>;
  upsert(tenantId: string, studentId: string): Promise<StudentPointsDocument>;
  addPoints(tenantId: string, studentId: string, activityType: PointActivityType, points: number, now: string): Promise<StudentPointsDocument>;
  findTopByTotal(tenantId: string, limit: number): Promise<StudentPointsDocument[]>;
  findTopByWeekly(tenantId: string, limit: number): Promise<StudentPointsDocument[]>;
  findTopByMonthly(tenantId: string, limit: number): Promise<StudentPointsDocument[]>;
  rolloverPeriods(tenantId: string, studentId: string, now: string): Promise<void>;
}
