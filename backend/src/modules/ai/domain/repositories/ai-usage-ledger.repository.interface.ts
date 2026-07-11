import { AiFeatureType } from '@shared/enums/ai.enum';

export interface RecordAiUsageInput {
  tenantId: string;
  requestedBy: string;
  studentId: string | null;
  featureTag: AiFeatureType;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  modelVersion: string | null;
}

/**
 * IAiUsageLedgerRepository — the cost-control audit trail. `getSpendSince`
 * backs `AiCostGuardService`'s daily/monthly budget checks (see AI Safety
 * & Cost Control strategy, docs/architecture/13-phase-11-...).
 */
export interface IAiUsageLedgerRepository {
  record(input: RecordAiUsageInput): Promise<void>;
  getSpendSince(tenantId: string, since: Date): Promise<number>;
}

export const AI_USAGE_LEDGER_REPOSITORY = Symbol('AI_USAGE_LEDGER_REPOSITORY');
