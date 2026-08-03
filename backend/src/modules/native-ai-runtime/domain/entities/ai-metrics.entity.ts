/**
 * AI Metrics & Telemetry entities.
 * All metrics are in-memory; they reset on process restart.
 */
export interface OperationMetrics {
  /** Total number of invocations. */
  count: number;
  /** Total duration across all invocations (ms). */
  totalDurationMs: number;
  /** Moving average duration (ms). */
  averageDurationMs: number;
  /** Peak duration observed (ms). */
  peakDurationMs: number;
  /** Number of invocations that ended in an error. */
  errorCount: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  /** hits / (hits + misses), NaN when both are 0. */
  hitRate: number;
  totalEntries: number;
  expiredEvictions: number;
}

export interface TelemetrySummary {
  tenantId: string | 'global';
  /** Per-operation breakdown keyed by operation name. */
  operations: Record<string, OperationMetrics>;
  cache: CacheStats;
  totalOperations: number;
  totalErrors: number;
  overallErrorRate: number;
  lastResetAt: Date;
}
