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

export enum MistakeType {
  TAJWEED = 'tajweed',
  PRONUNCIATION = 'pronunciation',
  ORDER = 'order',
  OMISSION = 'omission',
  ADDITION = 'addition',
  STOPPING = 'stopping',
}

export enum MistakeSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
}
