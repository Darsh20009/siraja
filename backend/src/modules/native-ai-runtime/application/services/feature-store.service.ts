import { Injectable } from '@nestjs/common';
import type { FeatureName, FeatureVector } from '../../domain/entities/feature-vector.entity';
import { PipelineRules } from '../../domain/rules/pipeline.rules';

/**
 * FeatureStoreService — in-memory store of numeric feature vectors per student.
 *
 * Feature vectors are the primary input to the RiskEngine, RecommendationEngine,
 * and DecisionEngine.  Callers upsert features from domain data (sessions,
 * progress, mistakes) and downstream services read them.
 *
 * The store is tenant-isolated: vectors can only be accessed by their
 * owning tenant.
 */
@Injectable()
export class FeatureStoreService {
  private readonly store = new Map<string, FeatureVector>();

  // ── Write ──────────────────────────────────────────────────────────────────

  /**
   * Upsert feature values for a (tenantId, studentId) pair.
   * Only the supplied feature names are updated; others remain unchanged.
   */
  upsert(
    tenantId: string,
    studentId: string,
    features: Partial<Record<FeatureName, number>>,
  ): FeatureVector {
    const key = this.buildKey(tenantId, studentId);
    const existing = this.store.get(key);
    if (existing) {
      Object.assign(existing.features, features);
      existing.updatedAt = new Date();
      existing.version++;
      return existing;
    }
    const vector: FeatureVector = {
      key,
      tenantId,
      studentId,
      features: { ...features },
      updatedAt: new Date(),
      version: 1,
    };
    this.store.set(key, vector);
    return vector;
  }

  /** Delete the feature vector for a student. */
  delete(tenantId: string, studentId: string): void {
    this.store.delete(this.buildKey(tenantId, studentId));
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  /** Retrieve the feature vector for a student, or undefined if absent. */
  get(tenantId: string, studentId: string): FeatureVector | undefined {
    return this.store.get(this.buildKey(tenantId, studentId));
  }

  /**
   * Retrieve the feature vector, falling back to all-zero defaults if absent.
   * Guarantees a complete Record<FeatureName, number> for engine consumption.
   */
  getOrDefault(tenantId: string, studentId: string): FeatureVector {
    return (
      this.get(tenantId, studentId) ?? {
        key: this.buildKey(tenantId, studentId),
        tenantId,
        studentId,
        features: this.defaultFeatures(),
        updatedAt: new Date(),
        version: 0,
      }
    );
  }

  /** Return all feature vectors for a tenant. */
  getAllForTenant(tenantId: string): FeatureVector[] {
    return Array.from(this.store.values()).filter((v) => v.tenantId === tenantId);
  }

  // ── Feature extraction helpers ────────────────────────────────────────────

  /**
   * Build a feature map from raw input fields.
   * Converts domain-level numbers into the expected numeric feature space.
   * Unknown keys are silently ignored.
   */
  buildFeaturesFromInput(
    input: Record<string, unknown>,
  ): Partial<Record<FeatureName, number>> {
    const features: Partial<Record<FeatureName, number>> = {};
    const fieldMap: Record<string, FeatureName> = {
      velocity: 'velocity',
      burdenScore: 'burdenScore',
      tajweedScore: 'tajweedScore',
      retentionProbability: 'retentionRate',
      retentionRate: 'retentionRate',
      daysSinceLastSession: 'daysSinceLastSession',
      forgettingRate: 'forgettingRate',
      currentDifficultyLevel: 'difficultyLevel',
      completionPercent: 'completionPercent',
      riskScore: 'riskScore',
    };

    for (const [inputKey, featureName] of Object.entries(fieldMap)) {
      const val = input[inputKey];
      if (typeof val === 'number') {
        features[featureName] = val;
      }
    }

    // Derived: retentionRate stored as × 100 (0–100 not 0–1)
    if (features.retentionRate !== undefined && features.retentionRate <= 1) {
      features.retentionRate = features.retentionRate * 100;
    }

    return features;
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private buildKey(tenantId: string, studentId: string): string {
    return `${tenantId}:${studentId}`;
  }

  private defaultFeatures(): Partial<Record<FeatureName, number>> {
    const d = PipelineRules.DEFAULT_FEATURE_VALUE;
    return {
      velocity: d,
      burdenScore: d,
      tajweedScore: 100, // assume perfect until evidence otherwise
      retentionRate: 100,
      daysSinceLastSession: d,
      consistencyScore: d,
      mistakeRate: d,
      difficultyLevel: 2,
      engagementScore: d,
      riskScore: d,
      completionPercent: d,
      forgettingRate: d,
    };
  }
}
