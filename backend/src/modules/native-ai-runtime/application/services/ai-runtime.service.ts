import { Injectable } from '@nestjs/common';
import type { PipelineConfig } from '../../domain/entities/ai-pipeline.entity';

export interface AiRuntimeStatus {
  readonly status: 'ready';
  readonly registeredPipelines: string[];
  readonly startedAt: Date;
  readonly uptimeMs: number;
}

/**
 * AiRuntimeService — lifecycle manager for the Native AI Runtime.
 *
 * Responsibilities:
 * - Owns the registry of named PipelineConfigs.
 * - Exposes a runtime status snapshot (uptime, registered pipelines).
 * - Acts as a central service other orchestrators can query for pipeline
 *   definitions.
 *
 * Stateless with respect to individual requests; pipeline registry is built
 * at DI-container boot and never mutated afterwards.
 */
@Injectable()
export class AiRuntimeService {
  private readonly pipelines = new Map<string, PipelineConfig>();
  private readonly startedAt = new Date();

  /** Register a named pipeline configuration. */
  registerPipeline(config: PipelineConfig): void {
    this.pipelines.set(config.name, config);
  }

  /** Retrieve a pipeline configuration by name. Returns undefined when absent. */
  getPipeline(name: string): PipelineConfig | undefined {
    return this.pipelines.get(name);
  }

  /** List all registered pipeline names. */
  listPipelines(): string[] {
    return Array.from(this.pipelines.keys());
  }

  /** Return a point-in-time runtime status snapshot. */
  getStatus(): AiRuntimeStatus {
    return {
      status: 'ready',
      registeredPipelines: this.listPipelines(),
      startedAt: this.startedAt,
      uptimeMs: Date.now() - this.startedAt.getTime(),
    };
  }
}
