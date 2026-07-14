/** BullMQ queue names — used as both the queue name and the injection token key. */
export const QUEUE_AI = 'ai-queue';
export const QUEUE_EMAIL = 'email-queue';
export const QUEUE_NOTIFICATION = 'notification-queue';
export const QUEUE_REPORT = 'report-queue';
export const QUEUE_AUDIO = 'audio-queue';

/** All queue names in declaration order. */
export const ALL_QUEUES = [
  QUEUE_AI,
  QUEUE_EMAIL,
  QUEUE_NOTIFICATION,
  QUEUE_REPORT,
  QUEUE_AUDIO,
] as const;

export type QueueName = (typeof ALL_QUEUES)[number];

// ─── Job names ────────────────────────────────────────────────────────────

export const JOB_EMAIL_WELCOME = 'email:welcome';
export const JOB_EMAIL_VERIFICATION = 'email:verification';
export const JOB_EMAIL_PASSWORD_RESET = 'email:password-reset';
export const JOB_EMAIL_NOTIFICATION = 'email:notification';
export const JOB_EMAIL_SYSTEM_ALERT = 'email:system-alert';

export const JOB_AI_INSIGHT = 'ai:insight';
export const JOB_AI_WEAKNESS_REPORT = 'ai:weakness-report';
export const JOB_AI_FORECAST_EXPLANATION = 'ai:forecast-explanation';

export const JOB_NOTIFICATION_PUSH = 'notification:push';
export const JOB_NOTIFICATION_IN_APP = 'notification:in-app';

export const JOB_REPORT_STUDENT_PROGRESS = 'report:student-progress';
export const JOB_REPORT_CIRCLE_SUMMARY = 'report:circle-summary';
export const JOB_REPORT_ATTENDANCE = 'report:attendance';

export const JOB_AUDIO_PROCESS = 'audio:process';

// ─── Default job options ──────────────────────────────────────────────────

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1_000, // 1s, 2s, 4s
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 }, // keep last 200 failed for DLQ inspection
};

export const CRITICAL_JOB_OPTIONS = {
  ...DEFAULT_JOB_OPTIONS,
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 2_000, // 2s, 4s, 8s, 16s, 32s
  },
  priority: 1,
};
