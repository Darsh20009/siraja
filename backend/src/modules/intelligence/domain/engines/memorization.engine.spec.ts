import { EvaluationGrade } from '@shared/enums/memorization.enum';
import { MemorizationEngine, MemorizationSessionData } from './memorization.engine';

const engine = new MemorizationEngine();

function makeSession(overrides: Partial<MemorizationSessionData> & { daysAgo: number }): MemorizationSessionData {
  const d = new Date();
  d.setDate(d.getDate() - overrides.daysAgo);
  return {
    score: overrides.score ?? 80,
    grade: overrides.grade ?? EvaluationGrade.GOOD,
    ayahsCount: overrides.ayahsCount ?? 5,
    evaluatedAt: d,
  };
}

describe('MemorizationEngine', () => {
  describe('analyse([])', () => {
    it('returns zeroed analysis for empty input', () => {
      const r = engine.analyse([]);
      expect(r.memorizationScore).toBe(0);
      expect(r.totalSessions).toBe(0);
      expect(r.trend).toBe('stable');
    });
  });

  describe('analyse() — basic sessions', () => {
    const sessions: MemorizationSessionData[] = [
      makeSession({ daysAgo: 1, score: 90, grade: EvaluationGrade.EXCELLENT, ayahsCount: 10 }),
      makeSession({ daysAgo: 2, score: 85, grade: EvaluationGrade.VERY_GOOD, ayahsCount: 8 }),
      makeSession({ daysAgo: 3, score: 70, grade: EvaluationGrade.GOOD, ayahsCount: 5 }),
    ];

    it('computes a positive memorization score', () => {
      const r = engine.analyse(sessions);
      expect(r.memorizationScore).toBeGreaterThan(0);
      expect(r.memorizationScore).toBeLessThanOrEqual(100);
    });

    it('counts active days correctly', () => {
      const r = engine.analyse(sessions);
      expect(r.activeDaysLast30).toBe(3);
    });

    it('totals ayahs in last 30 days', () => {
      const r = engine.analyse(sessions);
      expect(r.totalAyahsLast30).toBe(23);
    });

    it('sets trend to "improving" when all sessions are recent', () => {
      const r = engine.analyse(sessions);
      expect(['improving', 'stable']).toContain(r.trend);
    });

    it('has correct grade distribution', () => {
      const r = engine.analyse(sessions);
      expect(r.gradeDistribution[EvaluationGrade.EXCELLENT]).toBe(1);
      expect(r.gradeDistribution[EvaluationGrade.VERY_GOOD]).toBe(1);
      expect(r.gradeDistribution[EvaluationGrade.GOOD]).toBe(1);
    });
  });

  describe('trend detection', () => {
    it('returns "declining" when older sessions had higher pace', () => {
      const sessions: MemorizationSessionData[] = [
        // 15–28 days ago (previous period) — high pace
        ...Array.from({ length: 7 }, (_, i) => makeSession({ daysAgo: 15 + i, ayahsCount: 10, score: 80, grade: EvaluationGrade.GOOD })),
        // last 14 days — low pace
        ...Array.from({ length: 2 }, (_, i) => makeSession({ daysAgo: i + 1, ayahsCount: 1, score: 80, grade: EvaluationGrade.GOOD })),
      ];
      const r = engine.analyse(sessions);
      expect(r.trend).toBe('declining');
    });

    it('returns "improving" when recent period has higher pace', () => {
      const sessions: MemorizationSessionData[] = [
        // old — low
        ...Array.from({ length: 2 }, (_, i) => makeSession({ daysAgo: 20 + i, ayahsCount: 1, score: 60, grade: EvaluationGrade.ACCEPTABLE })),
        // recent — high
        ...Array.from({ length: 7 }, (_, i) => makeSession({ daysAgo: i + 1, ayahsCount: 10, score: 90, grade: EvaluationGrade.EXCELLENT })),
      ];
      const r = engine.analyse(sessions);
      expect(r.trend).toBe('improving');
    });
  });

  describe('score boundaries', () => {
    it('caps score at 100', () => {
      const sessions = Array.from({ length: 20 }, (_, i) =>
        makeSession({ daysAgo: i, score: 100, grade: EvaluationGrade.EXCELLENT, ayahsCount: 20 }),
      );
      const r = engine.analyse(sessions);
      expect(r.memorizationScore).toBeLessThanOrEqual(100);
    });
  });
});
