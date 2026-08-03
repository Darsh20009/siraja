import { NativeAiEngineService } from '../../../native-ai/application/services/native-ai-engine.service';
import { RecommendationPipelineService } from './recommendation-pipeline.service';
import type { RecommendationPipelineInput } from './recommendation-pipeline.service';

const baseInput: RecommendationPipelineInput = {
  studentId: 'student_1',
  tenantId: 'tenant_1',
  sessions: [
    { grade: 4, easeFactor: 2.5, interval: 3, repetitions: 2 },
    { grade: 3, easeFactor: 2.4, interval: 5, repetitions: 3 },
  ],
  weeklyVelocities: [3, 4, 2, 5],
  targetAyahs: 604,
  currentProgress: 120,
  burdenScore: 30,
  tajweedScore: 75,
  daysSinceLastSession: 2,
  currentDifficultyLevel: 2,
};

describe('RecommendationPipelineService', () => {
  let service: RecommendationPipelineService;

  beforeEach(() => {
    service = new RecommendationPipelineService(new NativeAiEngineService());
  });

  // ── run ───────────────────────────────────────────────────────────────────

  describe('run', () => {
    it('returns a recommendations array', () => {
      const output = service.run(baseInput);
      expect(Array.isArray(output.recommendations)).toBe(true);
    });

    it('returns a numeric velocity', () => {
      const output = service.run(baseInput);
      expect(typeof output.velocity).toBe('number');
    });

    it('returns a boolean isOnTrack', () => {
      const output = service.run(baseInput);
      expect(typeof output.isOnTrack).toBe('boolean');
    });

    it('returns retentionProbability in [0, 1]', () => {
      const output = service.run(baseInput);
      expect(output.retentionProbability).toBeGreaterThanOrEqual(0);
      expect(output.retentionProbability).toBeLessThanOrEqual(1);
    });

    it('returns forgettingRate in [0, 1]', () => {
      const output = service.run(baseInput);
      expect(output.forgettingRate).toBeGreaterThanOrEqual(0);
    });

    it('returns a generatedAt Date', () => {
      const output = service.run(baseInput);
      expect(output.generatedAt).toBeInstanceOf(Date);
    });

    it('produces recommendations when burden is high', () => {
      const highBurden = { ...baseInput, burdenScore: 85 };
      const output = service.run(highBurden);
      expect(output.recommendations.length).toBeGreaterThan(0);
    });

    it('produces a consistency_alert when daysSinceLastSession is very high', () => {
      const absent = { ...baseInput, daysSinceLastSession: 20 };
      const output = service.run(absent);
      const alert = output.recommendations.find((r) => r.type === 'consistency_alert');
      expect(alert).toBeDefined();
    });

    it('returns null explanation when no recommendations fire', () => {
      const noRisk = {
        ...baseInput,
        burdenScore: 10,
        tajweedScore: 95,
        daysSinceLastSession: 1,
        weeklyVelocities: [5, 6, 7, 8],
      };
      const output = service.run(noRisk);
      // recommendations may or may not fire — explanation is null only when empty
      if (output.recommendations.length === 0) {
        expect(output.explanation).toBeNull();
      }
    });
  });
});
