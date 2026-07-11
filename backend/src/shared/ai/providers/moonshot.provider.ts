import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILlmProvider, LlmChatOptions, LlmChatResult } from '../llm-provider.interface';
import { AiUnavailableException } from '../ai-unavailable.exception';

/**
 * MoonshotProvider — the only LLM vendor integrated in Phase 11 (see
 * docs/architecture/13-phase-11-ai-learning-intelligence-plan.md, §2).
 * Calls Moonshot AI's OpenAI-compatible `/chat/completions` endpoint
 * directly over HTTPS using `MOONSHOT_API_KEY`.
 *
 * Configured entirely from environment variables (MOONSHOT_API_KEY,
 * MOONSHOT_BASE_URL, MOONSHOT_MODEL). If MOONSHOT_API_KEY is not set, the
 * provider logs a warning at boot and `isAvailable()` returns false —
 * callers (`AiInsightOrchestratorService`) must check this and raise
 * `AiUnavailableException` rather than attempting the call, exactly like
 * `SmtpEmailProvider` does for email.
 */
@Injectable()
export class MoonshotProvider implements ILlmProvider {
  private readonly logger = new Logger(MoonshotProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('moonshot.apiKey', '');
    this.baseUrl = this.configService.get<string>('moonshot.baseUrl', 'https://api.moonshot.ai/v1');
    this.model = this.configService.get<string>('moonshot.model', 'moonshot-v1-8k');
    this.timeoutMs = this.configService.get<number>('moonshot.requestTimeoutMs', 15000);

    if (!this.apiKey) {
      this.logger.warn(
        'MOONSHOT_API_KEY is not set — AI features are disabled. ' +
          'Configure MOONSHOT_API_KEY to enable them.',
      );
    }
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(options: LlmChatOptions): Promise<LlmChatResult> {
    if (!this.isAvailable()) {
      throw new AiUnavailableException('AI_UNAVAILABLE', 'AI features are not configured on this server.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: options.messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 700,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Moonshot API error ${response.status}: ${body}`);
      }

      const data = (await response.json()) as {
        model: string;
        choices: { message: { content: string } }[];
        usage: { prompt_tokens: number; completion_tokens: number };
      };

      const content = data.choices?.[0]?.message?.content ?? '';
      return {
        content,
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
        },
        modelVersion: data.model ?? this.model,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Moonshot chat call failed: ${message}`);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
