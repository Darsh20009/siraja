import { StudentAchievementDocument } from '@database/mongoose/schemas';

export const STUDENT_ACHIEVEMENT_REPOSITORY = Symbol('STUDENT_ACHIEVEMENT_REPOSITORY');

export interface CreateStudentAchievementData {
  tenantId: string;
  studentId: string;
  achievementId: string;
  awardedAt: string;
  awardedBy: 'automatic' | 'manual';
  awardedByUserId?: string;
  note?: string;
}

export interface IStudentAchievementRepository {
  findByStudent(tenantId: string, studentId: string): Promise<StudentAchievementDocument[]>;
  hasAchievement(tenantId: string, studentId: string, achievementId: string): Promise<boolean>;
  create(data: CreateStudentAchievementData): Promise<StudentAchievementDocument>;
  countByStudent(tenantId: string, studentId: string): Promise<number>;
}
