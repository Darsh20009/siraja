export enum MemorizationStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  NEEDS_REVIEW = 'needs_review',
}

export enum EvaluationGrade {
  EXCELLENT = 'excellent',
  VERY_GOOD = 'very_good',
  GOOD = 'good',
  ACCEPTABLE = 'acceptable',
  WEAK = 'weak',
}

/**
 * Structural mistake types — what kind of error occurred during recitation.
 * These model the surface form of the mistake, not its Tajweed classification.
 */
export enum MistakeType {
  MISSING_WORD = 'missing_word',
  WRONG_WORD = 'wrong_word',
  REPEATED_WORD = 'repeated_word',
  SKIPPED_AYAH = 'skipped_ayah',
  ORDER_MISTAKE = 'order_mistake',
  OTHER = 'other',
}

export enum MistakeSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
}

export enum MistakeResolutionStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
}
