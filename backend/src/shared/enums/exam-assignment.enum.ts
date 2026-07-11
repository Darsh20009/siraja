/** Format of the exam (oral recitation, written test, or mixed). */
export enum ExamType {
  ORAL = 'oral',
  WRITTEN = 'written',
  MIXED = 'mixed',
}

/**
 * Category of the exam — what the student is being examined on.
 * Phase 8: Memorization Exams, Revision Exams, Completion Exams.
 */
export enum ExamCategory {
  MEMORIZATION = 'memorization',
  REVISION = 'revision',
  COMPLETION = 'completion',
}

export enum ExamStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  GRADED = 'graded',
  CANCELLED = 'cancelled',
}

/** Final pass/fail outcome of a graded exam. */
export enum ExamResult {
  PASS = 'pass',
  FAIL = 'fail',
  PENDING = 'pending',
}

export enum AssignmentStatus {
  ASSIGNED = 'assigned',
  SUBMITTED = 'submitted',
  REVIEWED = 'reviewed',
  OVERDUE = 'overdue',
}

/**
 * Nature of the assignment task — what type of work is being assigned.
 * Phase 8.
 */
export enum AssignmentType {
  HOMEWORK = 'homework',
  REVISION_TASK = 'revision_task',
  MEMORIZATION_TASK = 'memorization_task',
}

/** Assessment period type. Phase 8. */
export enum AssessmentType {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

/** Lifecycle state of an assessment record. */
export enum AssessmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}
