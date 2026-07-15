import { StreakDocument } from '@database/mongoose/schemas';

export const STREAK_REPOSITORY = Symbol('STREAK_REPOSITORY');

export interface IStreakRepository {
  findByStudent(tenantId: string, studentId: string): Promise<StreakDocument | null>;
  upsert(tenantId: string, studentId: string): Promise<StreakDocument>;
  recordActivity(tenantId: string, studentId: string, activityDate: string): Promise<StreakDocument>;
  findTopByDailyStreak(tenantId: string, limit: number): Promise<StreakDocument[]>;
}
