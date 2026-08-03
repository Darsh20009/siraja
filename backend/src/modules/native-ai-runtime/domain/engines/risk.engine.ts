import type { RiskAssessment, RiskFactor, RiskFactorType, RiskLevel } from '../entities/risk-assessment.entity';
import { RiskRules } from '../rules/risk.rules';

/**
 * RiskEngine — predicts student dropout/failure risk from a numeric feature map.
 *
 * Fully deterministic; no external AI; no side effects.
 *
 * Risk score 0–100 is built by evaluating six weighted risk factors:
 *   inactivity, velocity, burden, retention, tajweed, mistakes.
 *
 * Risk levels:
 *   low      0–25
 *   medium  26–50
 *   high    51–75
 *   critical 76–100
 */
export class RiskEngine {
  /**
   * Produce a full RiskAssessment from a student's feature vector.
   * All features are numeric; missing features default to 0.
   */
  assess(
    studentId: string,
    tenantId: string,
    features: Record<string, number>,
  ): RiskAssessment {
    const riskFactors = this.identifyRiskFactors(features);
    const riskScore = this.computeRiskScore(riskFactors);
    const riskLevel = this.classifyRiskLevel(riskScore);
    const recommendations = this.generateRiskRecommendations(riskFactors, riskLevel);

    return {
      studentId,
      tenantId,
      riskScore,
      riskLevel,
      riskFactors,
      recommendations,
      assessedAt: new Date(),
    };
  }

  /**
   * Compute 0–100 risk score as a weighted sum of individual factor contributions.
   */
  computeRiskScore(factors: RiskFactor[]): number {
    const rawScore = factors.reduce((sum, f) => sum + f.contribution, 0);
    return Math.min(100, Math.round(rawScore));
  }

  /** Classify the numeric score into a RiskLevel band. */
  classifyRiskLevel(score: number): RiskLevel {
    if (score <= RiskRules.LOW_RISK_MAX) return 'low';
    if (score <= RiskRules.MEDIUM_RISK_MAX) return 'medium';
    if (score <= RiskRules.HIGH_RISK_MAX) return 'high';
    return 'critical';
  }

  /**
   * Evaluate each risk dimension and return only the factors that are
   * actively contributing to risk.
   */
  identifyRiskFactors(features: Record<string, number>): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // 1. Inactivity
    const daysSince = features['daysSinceLastSession'] ?? 0;
    if (daysSince >= RiskRules.ABSENCE_DAYS_THRESHOLD) {
      const isCritical = daysSince >= RiskRules.CRITICAL_ABSENCE_DAYS;
      factors.push(
        this.makeFactor(
          'inactivity',
          'Recent Absence',
          isCritical
            ? RiskRules.WEIGHT_INACTIVITY * 100
            : RiskRules.WEIGHT_INACTIVITY * 60,
          daysSince,
          RiskRules.ABSENCE_DAYS_THRESHOLD,
          `No session recorded in the last ${daysSince} days.`,
        ),
      );
    }

    // 2. Low velocity
    const velocity = features['velocity'] ?? 0;
    if (velocity < RiskRules.MIN_SAFE_VELOCITY) {
      const isCritical = velocity < RiskRules.CRITICAL_VELOCITY;
      factors.push(
        this.makeFactor(
          'declining_velocity',
          'Low Memorization Pace',
          isCritical
            ? RiskRules.WEIGHT_VELOCITY * 100
            : RiskRules.WEIGHT_VELOCITY * 60,
          velocity,
          RiskRules.MIN_SAFE_VELOCITY,
          `Weekly pace of ${velocity.toFixed(1)} ayahs is below the safe minimum of ${RiskRules.MIN_SAFE_VELOCITY}.`,
        ),
      );
    }

    // 3. High burden
    const burden = features['burdenScore'] ?? 0;
    if (burden > RiskRules.HIGH_BURDEN_THRESHOLD) {
      const isCritical = burden > RiskRules.CRITICAL_BURDEN_THRESHOLD;
      factors.push(
        this.makeFactor(
          'high_burden',
          'High Review Burden',
          isCritical
            ? RiskRules.WEIGHT_BURDEN * 100
            : RiskRules.WEIGHT_BURDEN * 60,
          burden,
          RiskRules.HIGH_BURDEN_THRESHOLD,
          `Review burden of ${burden.toFixed(0)} is consuming too much capacity for new memorization.`,
        ),
      );
    }

    // 4. Low retention
    const retention = (features['retentionRate'] ?? 100) / 100; // stored × 100
    if (retention < RiskRules.LOW_RETENTION_THRESHOLD) {
      const isCritical = retention < RiskRules.CRITICAL_RETENTION_THRESHOLD;
      factors.push(
        this.makeFactor(
          'low_retention',
          'Low Retention Rate',
          isCritical
            ? RiskRules.WEIGHT_RETENTION * 100
            : RiskRules.WEIGHT_RETENTION * 60,
          retention * 100,
          RiskRules.LOW_RETENTION_THRESHOLD * 100,
          `Retention rate of ${(retention * 100).toFixed(0)}% indicates material is being forgotten quickly.`,
        ),
      );
    }

    // 5. Low tajweed
    const tajweed = features['tajweedScore'] ?? 100;
    if (tajweed < RiskRules.LOW_TAJWEED_THRESHOLD) {
      const isCritical = tajweed < RiskRules.CRITICAL_TAJWEED_THRESHOLD;
      factors.push(
        this.makeFactor(
          'low_tajweed',
          'Weak Tajweed',
          isCritical
            ? RiskRules.WEIGHT_TAJWEED * 100
            : RiskRules.WEIGHT_TAJWEED * 60,
          tajweed,
          RiskRules.LOW_TAJWEED_THRESHOLD,
          `Tajweed score of ${tajweed.toFixed(0)} is below the safe threshold.`,
        ),
      );
    }

    // 6. Systematic mistakes
    const mistakeRate = features['mistakeRate'] ?? 0;
    if (mistakeRate > RiskRules.HIGH_MISTAKE_RATE_THRESHOLD) {
      factors.push(
        this.makeFactor(
          'systematic_mistakes',
          'Persistent Mistakes',
          RiskRules.WEIGHT_MISTAKES * 100,
          mistakeRate,
          RiskRules.HIGH_MISTAKE_RATE_THRESHOLD,
          `Mistake rate of ${mistakeRate.toFixed(0)} indicates systematic pronunciation or recall issues.`,
        ),
      );
    }

    return factors;
  }

  /** Generate plain-language recommendations from the active risk factors. */
  generateRiskRecommendations(
    factors: RiskFactor[],
    riskLevel: RiskLevel,
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push(
        'Schedule an urgent check-in session with the student's sheikh immediately.',
      );
    }

    for (const factor of factors) {
      switch (factor.type) {
        case 'inactivity':
        case 'long_absence':
          recommendations.push(
            'Reach out to the student to understand the reason for absence and create a re-engagement plan.',
          );
          break;
        case 'declining_velocity':
          recommendations.push(
            'Review the student's weekly memorization target and consider reducing it to a sustainable level.',
          );
          break;
        case 'high_burden':
          recommendations.push(
            'Pause new memorization for 1–2 weeks and focus exclusively on consolidating existing material.',
          );
          break;
        case 'low_retention':
          recommendations.push(
            'Increase review frequency using spaced repetition and focus on suwar memorized more than 3 weeks ago.',
          );
          break;
        case 'low_tajweed':
          recommendations.push(
            'Dedicate the first 10 minutes of each session to targeted tajweed drills on the weakest rule.',
          );
          break;
        case 'systematic_mistakes':
          recommendations.push(
            'Identify the top 3 mistake patterns and create focused remediation exercises for each.',
          );
          break;
        case 'low_engagement':
          recommendations.push(
            'Introduce gamification elements or short milestone celebrations to re-engage the student.',
          );
          break;
      }
    }

    return [...new Set(recommendations)]; // deduplicate
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private makeFactor(
    type: RiskFactorType,
    label: string,
    contribution: number,
    observedValue: number,
    threshold: number,
    explanation: string,
  ): RiskFactor {
    return { type, label, contribution, observedValue, threshold, explanation };
  }
}
