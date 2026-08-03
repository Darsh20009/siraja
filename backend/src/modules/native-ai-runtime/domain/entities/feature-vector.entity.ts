/**
 * FeatureVector — a typed, versioned map of numeric features for one student
 * stored by the FeatureStoreService.
 *
 * All feature values are normalised to [0, 100] unless noted otherwise.
 */
export type FeatureName =
  | 'velocity'            // ayahs/week over last 4 weeks (raw, not normalised)
  | 'burdenScore'         // review burden 0–100
  | 'tajweedScore'        // tajweed proficiency 0–100
  | 'retentionRate'       // Ebbinghaus retention probability × 100
  | 'daysSinceLastSession'// integer days (raw, not normalised)
  | 'consistencyScore'    // sessions-per-week regularity 0–100
  | 'mistakeRate'         // mistakes per ayah × 100
  | 'difficultyLevel'     // current SM-2 difficulty 1–5 (raw)
  | 'engagementScore'     // composite: recency × frequency × volume, 0–100
  | 'riskScore'           // overall risk score 0–100
  | 'completionPercent'   // memorization goal progress 0–100
  | 'forgettingRate';     // Ebbinghaus forgetting rate × 100

export interface FeatureVector {
  /** Composite cache key: `${tenantId}:${studentId}`. */
  readonly key: string;
  readonly tenantId: string;
  readonly studentId: string;
  features: Partial<Record<FeatureName, number>>;
  updatedAt: Date;
  /** Incremented on each upsert. */
  version: number;
}
