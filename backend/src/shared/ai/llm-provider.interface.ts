/**
 * ILlmProvider — vendor-agnostic LLM chat contract, mirroring the
 * `IEmailProvider` pattern (see `shared/email/email-provider.interface.ts`):
 * calling code never knows which vendor is bound, only `AiProviderModule`
 * does. Exactly one concrete implementation exists in Phase 11 —
 * `MoonshotProvider` — no other vendor is coded against; the interface
 * exists purely so a future vendor swap doesn't touch call sites.
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
  /** Vendor model identifier actually used, for audit (`AiReport.modelVersion`). */
  modelVersion: string;
}

export interface ILlmProvider {
  chat(options: LlmChatOptions): Promise<LlmChatResult>;
  /** Whether the provider is configured (has credentials) and able to serve requests. */
  isAvailable(): boolean;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
