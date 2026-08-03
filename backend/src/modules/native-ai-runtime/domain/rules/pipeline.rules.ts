/**
 * Pipeline Rules — immutable configuration constants for the AI runtime
 * pipeline layer (cache, batching, session management, timeouts).
 */
export const PipelineRules = {
  // ── Cache TTLs (milliseconds) ─────────────────────────────────────────────
  /** Default TTL for cached AI analysis results. */
  DEFAULT_CACHE_TTL_MS: 5 * 60 * 1000,      // 5 minutes
  /** TTL for risk assessments (they change slowly). */
  RISK_CACHE_TTL_MS: 10 * 60 * 1000,        // 10 minutes
  /** TTL for parent reports. */
  PARENT_REPORT_CACHE_TTL_MS: 15 * 60 * 1000, // 15 minutes
  /** TTL for sheikh dashboard snapshots. */
  SHEIKH_DASHBOARD_CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  /** TTL for student timeline aggregations. */
  TIMELINE_CACHE_TTL_MS: 3 * 60 * 1000,    // 3 minutes

  // ── Session management ────────────────────────────────────────────────────
  /** Duration after last activity before a session is considered "idle". */
  SESSION_IDLE_AFTER_MS: 10 * 60 * 1000,   // 10 minutes
  /** Duration after last activity before a session is auto-closed. */
  SESSION_CLOSE_AFTER_MS: 30 * 60 * 1000,  // 30 minutes
  /** Maximum sessions per tenant (oldest idle session evicted when exceeded). */
  MAX_SESSIONS_PER_TENANT: 500,

  // ── Batch limits ──────────────────────────────────────────────────────────
  /** Maximum students processed in a single sheikh-dashboard build. */
  MAX_STUDENTS_PER_DASHBOARD: 100,
  /** Maximum timeline events returned per student. */
  MAX_TIMELINE_EVENTS: 200,
  /** Maximum recommendations surfaced per context. */
  MAX_RECOMMENDATIONS: 8,

  // ── Metrics ───────────────────────────────────────────────────────────────
  /** Maximum latency samples stored per operation (ring-buffer). */
  MAX_LATENCY_SAMPLES: 100,

  // ── Feature store ─────────────────────────────────────────────────────────
  /** Default value for any missing numeric feature. */
  DEFAULT_FEATURE_VALUE: 0,
} as const;
