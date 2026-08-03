/**
 * RiskAssessment — predictive risk profile for a single student produced
 * by the RiskEngine.  All computation is deterministic and in-process.
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type RiskFactorType =
  | 'inactivity'
  | 'high_burden'
  | 'low_retention'
  | 'low_tajweed'
  | 'systematic_mistakes'
  | 'declining_velocity'
  | 'low_engagement'
  | 'long_absence';

export interface RiskFactor {
  type: RiskFactorType;
  /** Short human-readable label. */
  label: string;
  /** Contribution to the overall risk score (0–100). */
  contribution: number;
  /** The feature value that triggered this factor. */
  observedValue: number;
  /** The threshold that was crossed. */
  threshold: number;
  /** One-sentence explanation for the parent/sheikh dashboard. */
  explanation: string;
}

export interface RiskAssessment {
  readonly studentId: string;
  readonly tenantId: string;
  /** Overall risk score 0–100; 0 = no risk, 100 = critical. */
  readonly riskScore: number;
  readonly riskLevel: RiskLevel;
  readonly riskFactors: RiskFactor[];
  /**
   * Prioritised list of plain-language recommendations the sheikh or
   * parent can act on.
   */
  readonly recommendations: string[];
  readonly assessedAt: Date;
}
