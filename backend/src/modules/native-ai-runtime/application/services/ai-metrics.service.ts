import { Injectable } from '@nestjs/common';
import type { OperationMetrics, TelemetrySummary } from '../../domain/entities/ai-metrics.entity';
import { PipelineRules } from '../../domain/rules/pipeline.rules';

/**
 * AiMetricsService — in-process telemetry collector for the Native AI Runtime.
 *
 * Tracks per-operation counts, latencies, and error rates per tenant plus
 * global aggregates.  All data is in-memory; it resets on process restart.
 *
 * Design decision: no async, no external sinks — metrics stay local and
 * deterministic, consistent with the zero-external-dependency mandate.
 */
@Injectable()
export class AiMetricsService {
  /** tenantId → operation name → metrics */
  private readonly tenantMetrics = new Map<string, Map<string, OperationMetrics>>();
  private readonly globalMetrics = new Map<string, OperationMetrics>();
  /** Per-tenant cache hit/miss counters */
  private readonly cacheCounters = new Map<string, { hits: number; misses: number }>();
  private resetAt = new Date();

  // ── Record ────────────────────────────────────────────────────────────────

  /**
   * Record a single AI operation.
   *
   * @param tenantId   - The tenant that invoked the operation.
   * @param operation  - Human-readable operation name (e.g. "run_student_analysis").
   * @param durationMs - Wall-clock duration in milliseconds.
   * @param success    - Whether the operation completed without an error.
   */
  recordOperation(
    tenantId: string,
    operation: string,
    durationMs: number,
    success: boolean,
  ): void {
    this.updateMetrics(this.getOrCreateTenantOp(tenantId, operation), durationMs, success);
    this.updateMetrics(this.getOrCreateGlobalOp(operation), durationMs, success);
  }

  recordCacheHit(tenantId: string): void {
    const c = this.getCacheCounters(tenantId);
    c.hits++;
  }

  recordCacheMiss(tenantId: string): void {
    const c = this.getCacheCounters(tenantId);
    c.misses++;
  }

  // ── Query ─────────────────────────────────────────────────────────────────

  /** Return a telemetry summary for a specific tenant. */
  getSummary(tenantId: string): TelemetrySummary {
    return this.buildSummary(tenantId, this.tenantMetrics.get(tenantId));
  }

  /** Return a global telemetry summary across all tenants. */
  getGlobalSummary(): TelemetrySummary {
    return this.buildSummary('global', this.globalMetricsAsMap());
  }

  /** Reset metrics for a tenant, or all metrics if tenantId is omitted. */
  reset(tenantId?: string): void {
    if (tenantId) {
      this.tenantMetrics.delete(tenantId);
      this.cacheCounters.delete(tenantId);
    } else {
      this.tenantMetrics.clear();
      this.globalMetrics.clear();
      this.cacheCounters.clear();
      this.resetAt = new Date();
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private updateMetrics(metrics: OperationMetrics, durationMs: number, success: boolean): void {
    metrics.count++;
    metrics.totalDurationMs += durationMs;
    metrics.averageDurationMs = metrics.totalDurationMs / metrics.count;
    if (durationMs > metrics.peakDurationMs) metrics.peakDurationMs = durationMs;
    if (!success) metrics.errorCount++;
    // Cap latency samples (handled via count/total; no raw array stored)
  }

  private getOrCreateTenantOp(tenantId: string, operation: string): OperationMetrics {
    if (!this.tenantMetrics.has(tenantId)) {
      this.tenantMetrics.set(tenantId, new Map());
    }
    const ops = this.tenantMetrics.get(tenantId)!;
    if (!ops.has(operation)) {
      ops.set(operation, this.emptyMetrics());
    }
    return ops.get(operation)!;
  }

  private getOrCreateGlobalOp(operation: string): OperationMetrics {
    if (!this.globalMetrics.has(operation)) {
      this.globalMetrics.set(operation, this.emptyMetrics());
    }
    return this.globalMetrics.get(operation)!;
  }

  private getCacheCounters(tenantId: string): { hits: number; misses: number } {
    if (!this.cacheCounters.has(tenantId)) {
      this.cacheCounters.set(tenantId, { hits: 0, misses: 0 });
    }
    return this.cacheCounters.get(tenantId)!;
  }

  private emptyMetrics(): OperationMetrics {
    return {
      count: 0,
      totalDurationMs: 0,
      averageDurationMs: 0,
      peakDurationMs: 0,
      errorCount: 0,
    };
  }

  private buildSummary(
    tenantId: string | 'global',
    opsMap: Map<string, OperationMetrics> | undefined,
  ): TelemetrySummary {
    const operations: Record<string, OperationMetrics> = {};
    let totalOps = 0;
    let totalErrors = 0;

    if (opsMap) {
      for (const [name, metrics] of opsMap) {
        operations[name] = { ...metrics };
        totalOps += metrics.count;
        totalErrors += metrics.errorCount;
      }
    }

    const cc = tenantId !== 'global' ? this.getCacheCounters(tenantId) : this.aggregateCacheCounters();
    const cacheTotal = cc.hits + cc.misses;

    return {
      tenantId,
      operations,
      cache: {
        hits: cc.hits,
        misses: cc.misses,
        hitRate: cacheTotal > 0 ? cc.hits / cacheTotal : 0,
        totalEntries: 0, // not tracked here; use AiCacheService.getStats()
        expiredEvictions: 0,
      },
      totalOperations: totalOps,
      totalErrors,
      overallErrorRate: totalOps > 0 ? totalErrors / totalOps : 0,
      lastResetAt: this.resetAt,
    };
  }

  private globalMetricsAsMap(): Map<string, OperationMetrics> {
    return this.globalMetrics;
  }

  private aggregateCacheCounters(): { hits: number; misses: number } {
    let hits = 0;
    let misses = 0;
    for (const c of this.cacheCounters.values()) {
      hits += c.hits;
      misses += c.misses;
    }
    return { hits, misses };
  }

  // Keep the constant reference without unused-var lint error
  private readonly _maxSamples = PipelineRules.MAX_LATENCY_SAMPLES;
}
