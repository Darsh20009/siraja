import { FeatureStoreService } from './feature-store.service';

describe('FeatureStoreService', () => {
  let store: FeatureStoreService;

  beforeEach(() => {
    store = new FeatureStoreService();
  });

  // ── upsert ────────────────────────────────────────────────────────────────

  describe('upsert', () => {
    it('creates a new vector when none exists', () => {
      const fv = store.upsert('t1', 's1', { velocity: 3 });
      expect(fv.features.velocity).toBe(3);
      expect(fv.version).toBe(1);
    });

    it('merges new features into existing vector', () => {
      store.upsert('t1', 's1', { velocity: 3 });
      const updated = store.upsert('t1', 's1', { burdenScore: 50 });
      expect(updated.features.velocity).toBe(3);
      expect(updated.features.burdenScore).toBe(50);
    });

    it('increments version on each upsert', () => {
      store.upsert('t1', 's1', { velocity: 1 });
      const v2 = store.upsert('t1', 's1', { velocity: 2 });
      expect(v2.version).toBe(2);
    });

    it('sets the correct tenantId and studentId', () => {
      const fv = store.upsert('tenant_x', 'student_y', {});
      expect(fv.tenantId).toBe('tenant_x');
      expect(fv.studentId).toBe('student_y');
    });

    it('builds the key as tenantId:studentId', () => {
      const fv = store.upsert('t', 's', {});
      expect(fv.key).toBe('t:s');
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns the vector for a known student', () => {
      store.upsert('t', 's', { tajweedScore: 80 });
      expect(store.get('t', 's')?.features.tajweedScore).toBe(80);
    });

    it('returns undefined for an unknown student', () => {
      expect(store.get('t', 'unknown')).toBeUndefined();
    });
  });

  // ── getOrDefault ──────────────────────────────────────────────────────────

  describe('getOrDefault', () => {
    it('returns stored vector when present', () => {
      store.upsert('t', 's', { velocity: 5 });
      const fv = store.getOrDefault('t', 's');
      expect(fv.features.velocity).toBe(5);
    });

    it('returns default vector when absent', () => {
      const fv = store.getOrDefault('t', 'new_student');
      expect(fv.version).toBe(0);
      expect(fv.features.tajweedScore).toBe(100); // default is "perfect"
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('removes the vector', () => {
      store.upsert('t', 's', {});
      store.delete('t', 's');
      expect(store.get('t', 's')).toBeUndefined();
    });
  });

  // ── getAllForTenant ────────────────────────────────────────────────────────

  describe('getAllForTenant', () => {
    it('returns only vectors belonging to the specified tenant', () => {
      store.upsert('t1', 's1', {});
      store.upsert('t1', 's2', {});
      store.upsert('t2', 's3', {});
      const vectors = store.getAllForTenant('t1');
      expect(vectors).toHaveLength(2);
      expect(vectors.every((v) => v.tenantId === 't1')).toBe(true);
    });

    it('returns empty array when tenant has no vectors', () => {
      expect(store.getAllForTenant('no_such_tenant')).toHaveLength(0);
    });
  });

  // ── buildFeaturesFromInput ─────────────────────────────────────────────────

  describe('buildFeaturesFromInput', () => {
    it('maps velocity from the input', () => {
      const f = store.buildFeaturesFromInput({ velocity: 4.5 });
      expect(f.velocity).toBe(4.5);
    });

    it('maps retentionProbability to retentionRate × 100', () => {
      const f = store.buildFeaturesFromInput({ retentionProbability: 0.75 });
      expect(f.retentionRate).toBe(75);
    });

    it('ignores unknown input keys without throwing', () => {
      expect(() => store.buildFeaturesFromInput({ unknownKey: 42 })).not.toThrow();
    });

    it('maps burdenScore directly', () => {
      const f = store.buildFeaturesFromInput({ burdenScore: 65 });
      expect(f.burdenScore).toBe(65);
    });
  });
});
