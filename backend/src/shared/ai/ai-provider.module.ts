import { Global, Module } from '@nestjs/common';
import { LLM_PROVIDER } from './llm-provider.interface';
import { MoonshotProvider } from './providers/moonshot.provider';

/**
 * AiProviderModule — global module providing ILlmProvider via DI.
 *
 * Marked @Global so every feature module can inject LLM_PROVIDER without
 * importing this module explicitly (same pattern as EmailModule). Swap
 * MoonshotProvider for a different concrete class here to change the LLM
 * vendor without touching any call site — though per Phase 11 scope,
 * Moonshot is the only vendor coded against.
 */
@Global()
@Module({
  providers: [
    {
      provide: LLM_PROVIDER,
      useClass: MoonshotProvider,
    },
  ],
  exports: [LLM_PROVIDER],
})
export class AiProviderModule {}
