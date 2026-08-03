/**
 * AI Pipeline domain types — defines the shape of pipeline steps,
 * configurations, and results processed by AiPipelineService.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PipelineStepFn = (input: any) => unknown;

export interface PipelineStep {
  /** Unique step identifier, e.g. "feature_extraction". */
  readonly name: string;
  /** The function executed for this step. */
  readonly fn: PipelineStepFn;
  /** When false the pipeline continues even if this step throws. */
  readonly required: boolean;
  /** Ascending sort order within the pipeline. */
  readonly order: number;
}

export type PipelineMode = 'sequential' | 'parallel';

export interface PipelineConfig {
  readonly name: string;
  /** Ordered list of step names to execute. */
  readonly steps: string[];
  readonly mode: PipelineMode;
}

export interface StepOutcome {
  stepName: string;
  success: boolean;
  result: unknown;
  durationMs: number;
  error?: string;
}

export interface PipelineResult {
  readonly pipelineName: string;
  readonly success: boolean;
  readonly durationMs: number;
  readonly stepOutcomes: StepOutcome[];
  /** Merged output from all steps (sequential: last-step value; parallel: map). */
  readonly output: unknown;
  readonly errors: string[];
}
