/**
 * Internal LLM boundary for the future local Siraja AI engine.
 *
 * Application services depend on this contract rather than an AI runtime or
 * provider implementation. The current adapter is intentionally unavailable
 * until the local engine is implemented.
 */
export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatOptions {
  messages: LlmChatMessage[];
  /** Lower = more deterministic. Defaults to a low value — this is coaching/analysis, not creative writing. */
  temperature?: number;
  /** Hard cap on generated tokens — keeps cost per call bounded and predictable. */
  maxTokens?: number;
}

export interface LlmChatResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  /** Internal engine/model identifier used for audit (`AiReport.modelVersion`). */
  modelVersion: string;
}

export interface ILlmProvider {
  chat(options: LlmChatOptions): Promise<LlmChatResult>;
  /** Whether the provider is configured (has credentials) and able to serve requests. */
  isAvailable(): boolean;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
