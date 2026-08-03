import { Injectable } from '@nestjs/common';
import type {
  PipelineConfig,
  PipelineResult,
  PipelineStep,
  PipelineStepFn,
  StepOutcome,
} from '../../domain/entities/ai-pipeline.entity';

/**
 * AiPipelineService — synchronous step-execution engine for the AI runtime.
 *
 * Callers register named step functions, then execute them as a named pipeline
 * (sequential or parallel).  All steps run synchronously; the "parallel" mode
 * still executes synchronously but collects all step results before returning.
 *
 * Design note: keeping execution synchronous is intentional — every engine
 * downstream is pure CPU computation with no I/O.  Async would add overhead
 * with no benefit.
 */
@Injectable()
export class AiPipelineService {
  private readonly registry = new Map<string, PipelineStep>();

  // ── Registration ──────────────────────────────────────────────────────────

  /** Register a named step function in the global step registry. */
  registerStep(name: string, fn: PipelineStepFn, required = true, order = 0): void {
    this.registry.set(name, { name, fn, required, order });
  }

  /** Return a registered step by name, or undefined when absent. */
  getStep(name: string): PipelineStep | undefined {
    return this.registry.get(name);
  }

  // ── Execution ─────────────────────────────────────────────────────────────

  /**
   * Execute a pipeline configuration.
   * Sequential mode: each step receives the output of the previous step as input.
   * Parallel mode: each step receives the same original input; results are merged
   *                into a record keyed by step name.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(config: PipelineConfig, input: unknown): PipelineResult {
    const start = Date.now();
    if (config.mode === 'parallel') {
      return this.runParallel(config, input, start);
    }
    return this.runSequential(config, input, start);
  }

  /** Convenience: run a list of step names sequentially without a PipelineConfig. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runSteps(stepNames: string[], input: unknown): PipelineResult {
    return this.run({ name: 'ad-hoc', steps: stepNames, mode: 'sequential' }, input);
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private runSequential(config: PipelineConfig, input: unknown, startMs: number): PipelineResult {
    const outcomes: StepOutcome[] = [];
    const errors: string[] = [];
    let current: unknown = input;

    for (const stepName of config.steps) {
      const step = this.registry.get(stepName);
      if (!step) {
        const msg = `Step "${stepName}" not found in registry.`;
        errors.push(msg);
        outcomes.push({ stepName, success: false, result: null, durationMs: 0, error: msg });
        if (!this.isStepRequired(stepName)) continue;
        break;
      }

      const stepStart = Date.now();
      let result: unknown = null;
      let success = false;
      let error: string | undefined;

      try {
        result = step.fn(current);
        success = true;
        current = result;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        errors.push(error);
        if (step.required) break;
      }

      outcomes.push({ stepName, success, result, durationMs: Date.now() - stepStart, error });
    }

    return {
      pipelineName: config.name,
      success: errors.length === 0,
      durationMs: Date.now() - startMs,
      stepOutcomes: outcomes,
      output: current,
      errors,
    };
  }

  private runParallel(config: PipelineConfig, input: unknown, startMs: number): PipelineResult {
    const outcomes: StepOutcome[] = [];
    const errors: string[] = [];
    const merged: Record<string, unknown> = {};

    for (const stepName of config.steps) {
      const step = this.registry.get(stepName);
      if (!step) {
        const msg = `Step "${stepName}" not found in registry.`;
        errors.push(msg);
        outcomes.push({ stepName, success: false, result: null, durationMs: 0, error: msg });
        continue;
      }

      const stepStart = Date.now();
      let result: unknown = null;
      let success = false;
      let error: string | undefined;

      try {
        result = step.fn(input);
        merged[stepName] = result;
        success = true;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        errors.push(error);
      }

      outcomes.push({ stepName, success, result, durationMs: Date.now() - stepStart, error });
    }

    return {
      pipelineName: config.name,
      success: errors.length === 0,
      durationMs: Date.now() - startMs,
      stepOutcomes: outcomes,
      output: merged,
      errors,
    };
  }

  private isStepRequired(stepName: string): boolean {
    return this.registry.get(stepName)?.required ?? true;
  }
}
