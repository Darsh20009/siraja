import { Injectable } from '@nestjs/common';
import type { AiContext } from '../../domain/entities/ai-context.entity';
import { AiRuntimeService } from '../services/ai-runtime.service';
import { AiCacheService } from '../services/ai-cache.service';
import { AiMetricsService } from '../services/ai-metrics.service';
import { AiEventBusService } from '../services/ai-event-bus.service';
import { AiPipelineService } from './ai-pipeline.service';
import type { PipelineResult } from '../../domain/entities/ai-pipeline.entity';

export interface OrchestratorResult {
  operation: string;
  result: unknown;
  durationMs: number;
  fromCache: boolean;
  pipelineResult?: PipelineResult;
}

/**
 * AiOrchestratorService — central routing hub for the Native AI Runtime.
 *
 * Routes incoming operation requests to the appropriate pipeline,
 * wires cache lookup/store, records telemetry, and fires events.
 *
 * All routing is deterministic: the same (operation, input) pair always
 * produces the same result within the cache TTL window.
 */
@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly runtime: AiRuntimeService,
    private readonly pipeline: AiPipelineService,
    private readonly cache: AiCacheService,
    private readonly metrics: AiMetricsService,
    private readonly eventBus: AiEventBusService,
  ) {}

  /**
   * Execute a named operation for a context, with cache + metrics wrapping.
   *
   * @param operation - Logical operation name (e.g. "run_student_analysis").
   * @param input     - Serialisable input object; used as part of the cache key.
   * @param context   - Caller's AI context (provides tenantId, userId etc.).
   * @param computeFn - The actual computation to run on cache miss.
   */
  execute(
    operation: string,
    input: Record<string, unknown>,
    context: AiContext,
    computeFn: (input: Record<string, unknown>) => unknown,
  ): OrchestratorResult {
    const start = Date.now();
    const cacheKey = this.cache.buildKey(context.tenantId, operation, this.hashInput(input));

    // ── Cache hit ───────────────────────────────────────────────────────────
    const cached = this.cache.get<unknown>(cacheKey);
    if (cached !== undefined) {
      this.metrics.recordCacheHit(context.tenantId);
      this.eventBus.dispatch('cache.hit', context.tenantId, { operation, cacheKey });
      return {
        operation,
        result: cached,
        durationMs: Date.now() - start,
        fromCache: true,
      };
    }

    this.metrics.recordCacheMiss(context.tenantId);
    this.eventBus.dispatch('cache.miss', context.tenantId, { operation });
    this.eventBus.dispatch('pipeline.started', context.tenantId, { operation });

    // ── Compute ─────────────────────────────────────────────────────────────
    let result: unknown;
    let success = false;

    try {
      // Try registered pipeline first
      const pipelineConfig = this.runtime.getPipeline(operation);
      if (pipelineConfig) {
        const pipelineResult = this.pipeline.run(pipelineConfig, input);
        result = pipelineResult.output;
        success = pipelineResult.success;
        const durationMs = Date.now() - start;
        this.cache.set(cacheKey, result);
        this.metrics.recordOperation(context.tenantId, operation, durationMs, success);
        this.eventBus.dispatch('pipeline.completed', context.tenantId, { operation, durationMs });
        return { operation, result, durationMs, fromCache: false, pipelineResult };
      }

      // Fall back to inline compute function
      result = computeFn(input);
      success = true;
    } catch (err) {
      success = false;
      this.eventBus.dispatch('pipeline.failed', context.tenantId, {
        operation,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      this.metrics.recordOperation(context.tenantId, operation, Date.now() - start, success);
    }

    this.cache.set(cacheKey, result);
    this.eventBus.dispatch('pipeline.completed', context.tenantId, {
      operation,
      durationMs: Date.now() - start,
    });

    return { operation, result, durationMs: Date.now() - start, fromCache: false };
  }

  // ── Private ──────────────────────────────────────────────────────────────

  /**
   * Produce a short deterministic hash of a plain object for cache keying.
   * Uses JSON serialisation + simple djb2 hash.
   */
  private hashInput(input: Record<string, unknown>): string {
    const json = JSON.stringify(input, Object.keys(input).sort());
    let hash = 5381;
    for (let i = 0; i < json.length; i++) {
      hash = ((hash << 5) + hash) ^ json.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }
}
