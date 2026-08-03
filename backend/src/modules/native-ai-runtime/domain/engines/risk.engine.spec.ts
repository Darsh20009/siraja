import { RiskEngine } from './risk.engine';
import { RiskRules } from '../rules/risk.rules';

describe('RiskEngine', () => {
  let engine: RiskEngine;

  beforeEach(() => {
    engine = new RiskEngine();
  });

  // ── assess ────────────────────────────────────────────────────────────────

  describe('assess', () => {
    it('returns a complete RiskAssessment object', () => {
      const result = engine.assess('student1', 'tenant1', {});
      expect(result.studentId).toBe('student1');
      expect(result.tenantId).toBe('tenant1');
      expect(typeof result.riskScore).toBe('number');
      expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
      expect(Array.isArray(result.riskFactors)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.assessedAt).toBeInstanceOf(Date);
    });

    it('returns "low" risk for a student with healthy features', () => {
      const result = engine.assess('s1', 't1', {
        velocity: 5,
        burdenScore: 20,
        tajweedScore: 85,
        retentionRate: 90,
        daysSinceLastSession: 2,
        mistakeRate: 3,
      });
      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBeLessThanOrEqual(RiskRules.LOW_RISK_MAX);
    });

    it('returns "critical" risk for a student with all bad features', () => {
      const result = engine.assess('s1', 't1', {
        velocity: 0,
        burdenScore: 90,
        tajweedScore: 15,
        retentionRate: 25,
        daysSinceLastSession: 30,
        mistakeRate: 30,
      });
      expect(result.riskLevel).toBe('critical');
    });

    it('flags inactivity when daysSinceLastSession exceeds threshold', () => {
      const result = engine.assess('s1', 't1', {
        daysSinceLastSession: RiskRules.ABSENCE_DAYS_THRESHOLD + 1,
      });
      const inactivity = result.riskFactors.find((f) => f.type === 'inactivity');
      expect(inactivity).toBeDefined();
    });

    it('does NOT flag inactivity when daysSinceLastSession is below threshold', () => {
      const result = engine.assess('s1', 't1', {
        daysSinceLastSession: RiskRules.ABSENCE_DAYS_THRESHOLD - 1,
      });
      const inactivity = result.riskFactors.find((f) => f.type === 'inactivity');
      expect(inactivity).toBeUndefined();
    });

    it('flags high burden when burdenScore exceeds threshold', () => {
      const result = engine.assess('s1', 't1', {
        burdenScore: RiskRules.HIGH_BURDEN_THRESHOLD + 1,
      });
      const burden = result.riskFactors.find((f) => f.type === 'high_burden');
      expect(burden).toBeDefined();
    });

    it('flags low tajweed when score is below threshold', () => {
      const result = engine.assess('s1', 't1', {
        tajweedScore: RiskRules.LOW_TAJWEED_THRESHOLD - 1,
      });
      const tajweed = result.riskFactors.find((f) => f.type === 'low_tajweed');
      expect(tajweed).toBeDefined();
    });

    it('populates recommendations for at-risk students', () => {
      const result = engine.assess('s1', 't1', {
        daysSinceLastSession: 20,
        burdenScore: 85,
      });
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  // ── classifyRiskLevel ─────────────────────────────────────────────────────

  describe('classifyRiskLevel', () => {
    it('classifies score 0 as "low"', () => {
      expect(engine.classifyRiskLevel(0)).toBe('low');
    });

    it('classifies score at LOW_RISK_MAX as "low"', () => {
      expect(engine.classifyRiskLevel(RiskRules.LOW_RISK_MAX)).toBe('low');
    });

    it('classifies score above LOW_RISK_MAX as "medium"', () => {
      expect(engine.classifyRiskLevel(RiskRules.LOW_RISK_MAX + 1)).toBe('medium');
    });

    it('classifies score above MEDIUM_RISK_MAX as "high"', () => {
      expect(engine.classifyRiskLevel(RiskRules.MEDIUM_RISK_MAX + 1)).toBe('high');
    });

    it('classifies score above HIGH_RISK_MAX as "critical"', () => {
      expect(engine.classifyRiskLevel(RiskRules.HIGH_RISK_MAX + 1)).toBe('critical');
    });

    it('classifies score 100 as "critical"', () => {
      expect(engine.classifyRiskLevel(100)).toBe('critical');
    });
  });

  // ── computeRiskScore ──────────────────────────────────────────────────────

  describe('computeRiskScore', () => {
    it('returns 0 for empty factor list', () => {
      expect(engine.computeRiskScore([])).toBe(0);
    });

    it('sums factor contributions and caps at 100', () => {
      const factors = [
        { type: 'inactivity' as const, label: '', contribution: 60, observedValue: 10, threshold: 7, explanation: '' },
        { type: 'high_burden' as const, label: '', contribution: 50, observedValue: 70, threshold: 60, explanation: '' },
      ];
      // 60 + 50 = 110 → capped to 100
      expect(engine.computeRiskScore(factors)).toBe(100);
    });
  });

  // ── identifyRiskFactors ───────────────────────────────────────────────────

  describe('identifyRiskFactors', () => {
    it('returns empty array for a student with all safe features', () => {
      const factors = engine.identifyRiskFactors({
        velocity: 10,
        burdenScore: 10,
        tajweedScore: 90,
        retentionRate: 95,
        daysSinceLastSession: 1,
        mistakeRate: 2,
      });
      expect(factors).toHaveLength(0);
    });

    it('identifies declining_velocity when velocity < MIN_SAFE_VELOCITY', () => {
      const factors = engine.identifyRiskFactors({ velocity: RiskRules.MIN_SAFE_VELOCITY - 0.1 });
      expect(factors.some((f) => f.type === 'declining_velocity')).toBe(true);
    });
  });
});
