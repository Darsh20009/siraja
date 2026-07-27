import { Injectable, Logger } from '@nestjs/common';
import { ILlmProvider, LlmChatOptions, LlmChatResult } from '../llm-provider.interface';
import { AiUnavailableException } from '../ai-unavailable.exception';

/**
 * Internal AI boundary for the future on-premise Siraja engine.
 *
 * This adapter deliberately does not make network requests, read provider
 * credentials, or fabricate an AI response. Keeping the adapter available in
 * the dependency graph lets the rest of the platform boot while AI features
 * remain explicitly unavailable until the local engine is implemented.
 */
@Injectable()
export class LocalSirajaAiProvider implements ILlmProvider {
  private readonly logger = new Logger(LocalSirajaAiProvider.name);

  isAvailable(): boolean {
    return false;
  }

  async chat(options: LlmChatOptions): Promise<LlmChatResult> {
    void options;
    this.logger.warn('The local Siraja AI engine is not configured; AI generation is unavailable.');
    throw new AiUnavailableException(
      'AI_UNAVAILABLE',
      'The local Siraja AI engine is not configured on this server.',
    );
  }
}