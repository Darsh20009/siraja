import { EvaluationGrade } from '@shared/enums/memorization.enum';
import { RevisionEngine, RevisionSessionData, AyahSm2Data } from './revision.engine';

const engine = new RevisionEngine();

function makeSession(daysAgo: number, grade: EvaluationGrade, ayahsCount = 5): RevisionSessionData {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { retentionGrade: grade, ayahsCount, reviewedAt: d };
}

function makeSm2(overdueByDays: number, masteryScore = 70): AyahSm2Data {
  const d = new Date();
  d.setDate(d.getDate() - overdueByDays);
  return { smNextReviewDue: d, masteryScore };
}

describe('RevisionEngine', () => {
  describe('analyse() — empty', () => {
    it('returns zero score for no sessions and no memorized content', () => {
      const r = engine.analyse([], [], 0);
      expect(r.revisionScore).toBe(0);
      expect(r.forgettingRisk).toBe('low');
    });

    it('returns medium forgetting risk when ayahs are memorized but no reviews', () => {
      const r = engine.analyse([], [], 100);
      expect(r.forgettingRisk).toBe('medium');
    });
  });

  describe('forgetting risk', () => {
    it('classifies low risk when < 5% overdue', () => {
      const sm2 = [makeSm2(1)]; // 1 overdue out of 100 memorized = 1%
      const r = engine.analyse([], sm2, 100);
      expect(r.forgettingRisk).toBe('low');
    });

    it('classifies medium risk when 5–20% overdue', () => {
      const sm2 = Array.from({ length: 10 }, () => makeSm2(1)); // 10% of 100
      const r = engine.analyse([], sm2, 100);
      expect(r.forgettingRisk).toBe('medium');
    });

    it('classifies high risk when > 20% overdue', () => {
      const sm2 = Array.from({ length: 25 }, () => makeSm2(1)); // 25% of 100
      const r = engine.analyse([], sm2, 100);
      expect(r.forgettingRisk).toBe('high');
    });
  });

  describe('revision score', () => {
    it('produces a higher score for excellent sessions', () => {
      const excellentSessions = Array.from({ length: 5 }, (_, i) =>
        makeSession(i + 1, EvaluationGrade.EXCELLENT),
      );
      const weakSessions = Array.from({ length: 5 }, (_, i) =>
        makeSession(i + 1, EvaluationGrade.WEAK),
      );
      const excellent = engine.analyse(excellentSessions, [], 50);
      const weak = engine.analyse(weakSessions, [], 50);
      expect(excellent.revisionScore).toBeGreaterThan(weak.revisionScore);
    });

    it('is bounded between 0 and 100', () => {
      const sessions = Array.from({ length: 20 }, (_, i) =>
        makeSession(i + 1, EvaluationGrade.EXCELLENT),
      );
      const r = engine.analyse(sessions, [], 0);
      expect(r.revisionScore).toBeGreaterThanOrEqual(0);
      expect(r.revisionScore).toBeLessThanOrEqual(100);
    });
  });

  describe('trend', () => {
    it('returns "improving" when recent sessions have better grades', () => {
      const old = Array.from({ length: 5 }, (_, i) =>
        makeSession(20 + i, EvaluationGrade.WEAK),
      );
      const recent = Array.from({ length: 5 }, (_, i) =>
        makeSession(i + 1, EvaluationGrade.EXCELLENT),
      );
      const r = engine.analyse([...old, ...recent], [], 0);
      expect(r.trend).toBe('improving');
    });
  });
});
