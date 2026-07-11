import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AI_USAGE_LEDGER_REPOSITORY,
  IAiUsageLedgerRepository,
} from '../../domain/repositories/ai-usage-ledger.repository.interface';
import { AiUnavailableException } from '@shared/ai/ai-unavailable.exception';

/**
 * AiCostGuardService — enforces the conservative $50–100/month AI budget
 * approved for Phase 11 before any Moonshot call is made. Two independent
 * caps (daily + monthly) so a single burst can't exhaust the whole
 * month's budget in one day.
 */
@Injectable()
export class AiCostGuardService {
  constructor(
    @Inject(AI_USAGE_LEDGER_REPOSITORY)
    private readonly usageRepo: IAiUsageLedgerRepository,
    private readonly configService: ConfigService,
  ) {}

  async assertWithinBudget(tenantId: string): Promise<void> {
    const dailyBudget = this.configService.get<number>('ai.dailyBudgetUsd', 3);
    const monthlyBudget = this.configService.get<number>('ai.monthlyBudgetUsd', 75);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dailySpend, monthlySpend] = await Promise.all([
      this.usageRepo.getSpendSince(tenantId, startOfDay),
      this.usageRepo.getSpendSince(tenantId, startOfMonth),
    ]);

    if (dailySpend >= dailyBudget) {
      throw new AiUnavailableException(
        'AI_BUDGET_EXCEEDED',
        `Daily AI budget of $${dailyBudget} has been reached. Try again tomorrow.`,
      );
    }
    if (monthlySpend >= monthlyBudget) {
      throw new AiUnavailableException(
        'AI_BUDGET_EXCEEDED',
        `Monthly AI budget of $${monthlyBudget} has been reached. Try again next month.`,
      );
    }
  }
}
