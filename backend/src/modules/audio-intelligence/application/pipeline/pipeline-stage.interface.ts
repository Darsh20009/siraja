import { AudioPipelineContext } from './pipeline-context';

/**
 * IPipelineStage — contract that every audio pipeline stage implements.
 *
 * Stages are NestJS @Injectable() services so they can receive injected
 * providers (IAudioPreprocessor, ISpeechRecognitionProvider, …) via the
 * NestJS DI container.
 *
 * Each stage reads from and writes to the shared AudioPipelineContext.
 * Stages MUST NOT communicate via return values — all state lives on the
 * context object.
 *
 * Error handling: stages throw descriptive errors when they cannot
 * complete (e.g. unsupported format, corrupt buffer). The pipeline service
 * catches these and transitions the session to 'failed'.
 */
export interface IPipelineStage {
  /**
   * Human-readable name of this stage.
   * Included in log messages and error context.
   */
  readonly stageName: string;

  /**
   * Execute the stage.
   * Reads from ctx and writes its outputs back onto ctx.
   * @throws Error with a descriptive message on failure.
   */
  execute(ctx: AudioPipelineContext): Promise<void>;
}
