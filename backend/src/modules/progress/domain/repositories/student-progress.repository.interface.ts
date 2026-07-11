export interface StudentProgressRecord {
  id: string;
  studentId: string;
  // Memorization
  totalAyahsMemorized: number;
  totalPagesMemorized: number;
  totalJuzMemorized: number;
  memorizationPercentage: number;
  totalMemorizationSessions: number;
  lastMemorizationDate: Date | null;
  // Revision
  totalAyahsRevised: number;
  revisionPercentage: number;
  totalRevisionSessions: number;
  lastRevisionDate: Date | null;
  // Streaks
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
  updatedAt: Date;
}

export interface UpsertProgressInput {
  tenantId: string;
  studentId: string;
  totalAyahsMemorized: number;
  totalPagesMemorized: number;
  totalJuzMemorized: number;
  memorizationPercentage: number;
  totalMemorizationSessions: number;
  lastMemorizationDate: Date | null;
  totalAyahsRevised: number;
  revisionPercentage: number;
  totalRevisionSessions: number;
  lastRevisionDate: Date | null;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
}

export interface IStudentProgressRepository {
  findByStudent(tenantId: string, studentId: string): Promise<StudentProgressRecord | null>;
  upsert(input: UpsertProgressInput): Promise<StudentProgressRecord>;
}

export const STUDENT_PROGRESS_REPOSITORY = Symbol('STUDENT_PROGRESS_REPOSITORY');
