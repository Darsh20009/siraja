import { StudentBadgeDocument } from '@database/mongoose/schemas';

export const STUDENT_BADGE_REPOSITORY = Symbol('STUDENT_BADGE_REPOSITORY');

export interface CreateStudentBadgeData {
  tenantId: string;
  studentId: string;
  badgeId: string;
  awardedAt: string;
  awardedBy: 'automatic' | 'manual' | 'rule';
  awardedByUserId?: string;
  triggeredByRuleId?: string;
  note?: string;
}

export interface IStudentBadgeRepository {
  findByStudent(tenantId: string, studentId: string): Promise<StudentBadgeDocument[]>;
  hasBadge(tenantId: string, studentId: string, badgeId: string): Promise<boolean>;
  create(data: CreateStudentBadgeData): Promise<StudentBadgeDocument>;
  countByStudent(tenantId: string, studentId: string): Promise<number>;
}
