import { Global, Module } from '@nestjs/common';
import { LLM_PROVIDER } from './llm-provider.interface';
import { LocalSirajaAiProvider } from './providers/local-siraja-ai.provider';

/**
 * AiProviderModule — global module providing ILlmProvider via DI.
 *
 * Marked @Global so every feature module can inject LLM_PROVIDER without
 * importing this module explicitly. The provider is intentionally a local,
 * unavailable adapter until the future Siraja AI engine is implemented.
 * No external AI service is contacted by this module.
 */
@Global()
@Module({
  providers: [
    {
      provide: LLM_PROVIDER,
      useClass: LocalSirajaAiProvider,
    },
  ],
  exports: [LLM_PROVIDER],
})
export class AiProviderModule {}
