import { createHash } from 'crypto';

/**
 * Deterministic hash of the platform data an AI report was grounded in.
 * A later request for the same feature/student whose underlying data
 * hasn't changed reuses the cached report instead of calling the LLM
 * again — the primary cost-control lever alongside the usage ledger.
 */
export function computeSourceDataHash(parts: unknown): string {
  const json = JSON.stringify(parts, Object.keys(parts as object).sort?.() ?? undefined);
  return createHash('sha256').update(json).digest('hex').slice(0, 32);
}
