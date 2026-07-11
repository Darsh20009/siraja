import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Thrown whenever an AI feature is invoked but Moonshot is not configured
 * (`MOONSHOT_API_KEY` unset) or a per-tenant AI budget has been exceeded.
 * Surfaces as HTTP 503 with a machine-readable `code` so clients can
 * distinguish "AI not configured" from "AI budget exceeded" without
 * parsing prose.
 */
export class AiUnavailableException extends ServiceUnavailableException {
  constructor(code: 'AI_UNAVAILABLE' | 'AI_BUDGET_EXCEEDED', message: string) {
    super({ statusCode: 503, code, message });
  }
}
