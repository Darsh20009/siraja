export enum AiRequestType {
  RECITATION_ANALYSIS = 'recitation_analysis',
  PROGRESS_SUMMARY = 'progress_summary',
  MISTAKE_DETECTION = 'mistake_detection',
  PARENT_REPORT = 'parent_report',
}

export enum AiRequestStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AiReportType {
  STUDENT_PROGRESS = 'student_progress',
  CIRCLE_PERFORMANCE = 'circle_performance',
  RECITATION_QUALITY = 'recitation_quality',
}
