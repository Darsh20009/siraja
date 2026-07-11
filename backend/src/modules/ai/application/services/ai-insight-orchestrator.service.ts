import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLM_PROVIDER, ILlmProvider } from '@shared/ai/llm-provider.interface';
import { AiUnavailableException } from '@shared/ai/ai-unavailable.exception';
import { AiFeatureType } from '@shared/enums/ai.enum';
import {
  AI_INSIGHT_REPOSITORY,
  AiReportItem,
  IAiInsightRepository,
} from '../../domain/repositories/ai-insight.repository.interface';
import {
  AI_USAGE_LEDGER_REPOSITORY,
  IAiUsageLedgerRepository,
} from '../../domain/repositories/ai-usage-ledger.repository.interface';
import { AiCostGuardService } from './ai-cost-guard.service';
import { computeSourceDataHash } from './source-data-hash.util';

export interface GetOrGenerateParams {
  tenantId: string;
  userId: string;
  studentId: string | null;
  type: AiFeatureType;
  /** Grounding data used only to compute the cache key — must fully capture what changed the answer. */
  sourceData: unknown;
  buildPrompt: () => { system: string; user: string };
  /** Structured payload to store alongside the narrative (e.g. the deterministic numbers it was generated from). */
  structured?: Record<string, unknown>;
  /** Bypasses the cache — used by the explicit "regenerate" endpoint (AI.CREATE), not by plain reads. */
  force?: boolean;
}

/**
 * AiInsightOrchestratorService — the single choke point every AI
 * pipeline in Phase 11 goes through: cache lookup → availability check →
 * budget check → LLM call → usage-ledger record → persist. Individual
 * use-cases (mistake intelligence, revision/memorization recommendations,
 * forecast explanation, sheikh/parent reports) only assemble grounding
 * data and a prompt; they never talk to `ILlmProvider` or the ledger
 * directly, which is how cost control stays uniform across features.
 */
@Injectable()
export class AiInsightOrchestratorService {
  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: ILlmProvider,
    @Inject(AI_INSIGHT_REPOSITORY) private readonly insightRepo: IAiInsightRepository,
    @Inject(AI_USAGE_LEDGER_REPOSITORY) private readonly usageRepo: IAiUsageLedgerRepository,
    private readonly costGuard: AiCostGuardService,
    private readonly configService: ConfigService,
  ) {}

  async getOrGenerate(params: GetOrGenerateParams): Promise<AiReportItem> {
    const cacheEnabled = this.configService.get<boolean>('ai.cacheEnabled', true);
    const sourceDataHash = computeSourceDataHash({ type: params.type, studentId: params.studentId, data: params.sourceData });

    if (cacheEnabled && !params.force) {
      const cached = await this.insightRepo.findLatest(params.tenantId, params.type, params.studentId);
      if (cached && cached.sourceDataHash === sourceDataHash) return cached;
    }

    if (!this.llm.isAvailable()) {
      throw new AiUnavailableException('AI_UNAVAILABLE', 'AI features are not configured on this server.');
    }
    await this.costGuard.assertWithinBudget(params.tenantId);

    const { system, user } = params.buildPrompt();
    const maxTokens = this.configService.get<number>('ai.maxCompletionTokens', 700);
    const result = await this.llm.chat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      maxTokens,
    });

    const priceIn = this.configService.get<number>('moonshot.pricePerMillionInputTokensUsd', 2);
    const priceOut = this.configService.get<number>('moonshot.pricePerMillionOutputTokensUsd', 10);
    const estimatedCostUsd =
      (result.usage.promptTokens / 1_000_000) * priceIn + (result.usage.completionTokens / 1_000_000) * priceOut;

    await this.usageRepo.record({
      tenantId: params.tenantId,
      requestedBy: params.userId,
      studentId: params.studentId,
      featureTag: params.type,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      estimatedCostUsd,
      modelVersion: result.modelVersion,
    });

    return this.insightRepo.create({
      tenantId: params.tenantId,
      requestedBy: params.userId,
      studentId: params.studentId,
      type: params.type,
      content: result.content,
      structured: params.structured,
      sourceDataHash,
      modelVersion: result.modelVersion,
    });
  }
}
