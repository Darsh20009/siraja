import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { AI_INSIGHT_REPOSITORY, IAiInsightRepository } from '../../domain/repositories/ai-insight.repository.interface';

/**
 * AcknowledgeAiInsightUseCase — the `AI.APPROVE` action described in
 * `permission-registry.ts` as "accept an AI report into the record": a
 * Sheikh/Supervisor/Admin marks an AI-generated report as reviewed. This
 * never changes any authoritative record — it only stamps the report
 * itself, keeping the "AI is advisory" boundary intact.
 */
@Injectable()
export class AcknowledgeAiInsightUseCase {
  constructor(
    @Inject(AI_INSIGHT_REPOSITORY) private readonly insightRepo: IAiInsightRepository,
  ) {}

  async execute(user: AccessTokenPayload, reportId: string) {
    const existing = await this.insightRepo.findById(user.tenantId, reportId);
    if (!existing) throw new NotFoundException('AI report not found.');
    return this.insightRepo.acknowledge(user.tenantId, reportId, user.sub);
  }
}
