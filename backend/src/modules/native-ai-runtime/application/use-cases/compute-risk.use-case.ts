import { Injectable } from '@nestjs/common';
import { RiskEngine } from '../../domain/engines/risk.engine';
import { ExplainabilityEngine } from '../../domain/engines/explainability.engine';
import { DecisionEngine } from '../../domain/engines/decision.engine';
import { RuleEngine } from '../../domain/engines/rule.engine';
import type { ComputeRiskRequestDto, ComputeRiskResponseDto } from '../dtos/risk-assessment.dto';
import type { AiRule } from '../../domain/entities/ai-rule.entity';
import { RiskRules } from '../../domain/rules/risk.rules';

/**
 * ComputeRiskUseCase — runs the full risk assessment pipeline:
 *   RiskEngine → RuleEngine → DecisionEngine → ExplainabilityEngine
 *
 * Returns a risk assessment with a plain-language explanation.
 */
@Injectable()
export class ComputeRiskUseCase {
  private readonly riskEngine = new RiskEngine();
  private readonly explainabilityEngine = new ExplainabilityEngine();
  private readonly decisionEngine = new DecisionEngine();
  private readonly ruleEngine = new RuleEngine();

  execute(dto: ComputeRiskRequestDto, tenantId: string): ComputeRiskResponseDto {
    const features = dto.features;

    // ── Risk assessment ───────────────────────────────────────────────────────
    const risk = this.riskEngine.assess(dto.studentId, tenantId, features);

    // ── Rule evaluation for explainability ────────────────────────────────────
    const rules = this.buildRiskRules();
    const ruleResult = this.ruleEngine.evaluate(rules, features);

    // ── Decision from risk score ──────────────────────────────────────────────
    const decisionNodes = [
      {
        id: 'root',
        condition: (f: Record<string, number>) => f['riskScore'] !== undefined
          ? f['riskScore'] > RiskRules.HIGH_RISK_MAX
          : risk.riskScore > RiskRules.HIGH_RISK_MAX,
        trueNodeId: 'critical',
        falseNodeId: 'non-critical',
        outcome: undefined,
        weight: 1.0,
      },
      {
        id: 'critical',
        condition: () => true,
        outcome: 'intervention_required',
        weight: 1.0,
      },
      {
        id: 'non-critical',
        condition: (f: Record<string, number>) => f['riskScore'] !== undefined
          ? f['riskScore'] > RiskRules.LOW_RISK_MAX
          : risk.riskScore > RiskRules.LOW_RISK_MAX,
        trueNodeId: 'flag',
        falseNodeId: 'no-action',
        outcome: undefined,
        weight: 0.8,
      },
      {
        id: 'flag',
        condition: () => true,
        outcome: 'risk_flag',
        weight: 0.8,
      },
      {
        id: 'no-action',
        condition: () => true,
        outcome: 'no_action',
        weight: 0.5,
      },
    ];

    const decision = this.decisionEngine.evaluate(
      decisionNodes,
      { ...features, riskScore: risk.riskScore },
      'risk_flag',
    );

    // ── Explainability ────────────────────────────────────────────────────────
    const explanation = this.explainabilityEngine.explain(
      { ...decision, rulesFired: ruleResult.firedRules.map((r) => r.id) },
      rules,
      features,
      this.buildThresholds(),
    );

    return {
      studentId: dto.studentId,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
      riskFactors: risk.riskFactors,
      recommendations: risk.recommendations,
      explanation,
      assessedAt: risk.assessedAt.toISOString(),
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private buildRiskRules(): AiRule[] {
    return [
      {
        id: 'risk.inactivity',
        name: 'Inactivity',
        category: 'risk',
        condition: (f) => (f['daysSinceLastSession'] ?? 0) >= RiskRules.ABSENCE_DAYS_THRESHOLD,
        weight: RiskRules.WEIGHT_INACTIVITY,
        description: `No session for ≥ ${RiskRules.ABSENCE_DAYS_THRESHOLD} days`,
        action: 'consistency_alert',
      },
      {
        id: 'risk.low_velocity',
        name: 'Low Velocity',
        category: 'risk',
        condition: (f) => (f['velocity'] ?? 0) < RiskRules.MIN_SAFE_VELOCITY,
        weight: RiskRules.WEIGHT_VELOCITY,
        description: `Velocity < ${RiskRules.MIN_SAFE_VELOCITY} ayahs/week`,
        action: 'adjust_difficulty_down',
      },
      {
        id: 'risk.high_burden',
        name: 'High Burden',
        category: 'risk',
        condition: (f) => (f['burdenScore'] ?? 0) > RiskRules.HIGH_BURDEN_THRESHOLD,
        weight: RiskRules.WEIGHT_BURDEN,
        description: `Burden score > ${RiskRules.HIGH_BURDEN_THRESHOLD}`,
        action: 'reduce_new_memorization',
      },
      {
        id: 'risk.low_retention',
        name: 'Low Retention',
        category: 'risk',
        condition: (f) => (f['retentionRate'] ?? 100) < RiskRules.LOW_RETENTION_THRESHOLD * 100,
        weight: RiskRules.WEIGHT_RETENTION,
        description: `Retention < ${RiskRules.LOW_RETENTION_THRESHOLD * 100}%`,
        action: 'increase_review_frequency',
      },
      {
        id: 'tajweed.low_score',
        name: 'Low Tajweed',
        category: 'tajweed',
        condition: (f) => (f['tajweedScore'] ?? 100) < RiskRules.LOW_TAJWEED_THRESHOLD,
        weight: RiskRules.WEIGHT_TAJWEED,
        description: `Tajweed score < ${RiskRules.LOW_TAJWEED_THRESHOLD}`,
        action: 'focus_tajweed_rule',
      },
      {
        id: 'risk.high_mistake_rate',
        name: 'High Mistake Rate',
        category: 'risk',
        condition: (f) => (f['mistakeRate'] ?? 0) > RiskRules.HIGH_MISTAKE_RATE_THRESHOLD,
        weight: RiskRules.WEIGHT_MISTAKES,
        description: `Mistake rate > ${RiskRules.HIGH_MISTAKE_RATE_THRESHOLD}`,
        action: 'address_systematic_mistake',
      },
    ];
  }

  private buildThresholds(): Record<string, number> {
    return {
      daysSinceLastSession: RiskRules.ABSENCE_DAYS_THRESHOLD,
      velocity: RiskRules.MIN_SAFE_VELOCITY,
      burdenScore: RiskRules.HIGH_BURDEN_THRESHOLD,
      retentionRate: RiskRules.LOW_RETENTION_THRESHOLD * 100,
      tajweedScore: RiskRules.LOW_TAJWEED_THRESHOLD,
      mistakeRate: RiskRules.HIGH_MISTAKE_RATE_THRESHOLD,
    };
  }
}
