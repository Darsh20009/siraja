import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Thrown whenever an AI feature is invoked before the local Siraja engine is
 * available or a per-tenant AI budget has been exceeded.
 */
export class AiUnavailableException extends ServiceUnavailableException {
  constructor(code: 'AI_UNAVAILABLE' | 'AI_BUDGET_EXCEEDED', message: string) {
    super({ statusCode: 503, code, message });
  }
}
