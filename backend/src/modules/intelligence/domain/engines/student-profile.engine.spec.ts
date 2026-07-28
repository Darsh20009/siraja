import { EvaluationGrade, MistakeSeverity, MistakeType } from '@shared/enums/memorization.enum';
import { StudentProfileEngine, StudentProfileInput } from './student-profile.engine';
import { MemorizationAnalysis } from './memorization.engine';
import { RevisionAnalysis } from './revision.engine';
import { MistakeAnalysis } from './mistake.engine';
import { DifficultyAnalysis } from './difficulty.engine';
import { AttendanceRules } from '../rules/attendance.rules';

const engine = new StudentProfileEngine();

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeGradeDistribution(
  overrides: Partial<Record<EvaluationGrade | 'ungraded', number>> = {},
): Record<EvaluationGrade | 'ungraded', number> {
  return {
    [EvaluationGrade.EXCELLENT]: 0,
    [EvaluationGrade.VERY_GOOD]: 0,
    [EvaluationGrade.GOOD]: 10,
    [EvaluationGrade.ACCEPTABLE]: 0,
    [EvaluationGrade.WEAK]: 0,
    ungraded: 0,
    ...overrides,
  };
}

function makeTypeBreakdown(): Record<MistakeType, number> {
  const r = {} as Record<MistakeType, number>;
  for (const t of Object.values(MistakeType)) r[t] = 0;
  return r;
}

function makeSeverityBreakdown(): Record<MistakeSeverity, number> {
  const r = {} as Record<MistakeSeverity, number>;
  for (const s of Object.values(MistakeSeverity)) r[s] = 0;
  return r;
}

function makeMemorizationAnalysis(
  overrides: Partial<MemorizationAnalysis> = {},
): MemorizationAnalysis {
  return {
    memorizationScore: 72,
    averageScore: 75,
    averageAyahsPerSession: 5,
    totalSessions: 40,
    totalAyahsLast30: 100,
    activeDaysLast30: 20,
    dailyPaceAyahs: 5,
    weeklyPaceAyahs: 35,
    gradeDistribution: makeGradeDistribution(),
    trend: 'stable',
    bestDayOfWeek: 'Monday',
    bestHour: 9, // 09:00 → morning
    ...overrides,
  };
}

function makeRevisionAnalysis(
  overrides: Partial<RevisionAnalysis> = {},
): RevisionAnalysis {
  return {
    revisionScore: 65,
    totalSessions: 20,
    totalAyahsRevised: 100,
    averageAyahsPerSession: 5,
    averageRetentionGrade: EvaluationGrade.GOOD,
    gradeBreakdown: makeGradeDistribution(),
    sessionsPerWeek: 2.5,
    overdueCount: 10,
    revisionBurdenScore: 20,
    forgettingRisk: 'low',
    onTimeRevisionRate: 90,
    trend: 'stable',
    bestHour: 19, // 19:00 → evening
    ...overrides,
  };
}

function makeMistakeAnalysis(
  overrides: Partial<MistakeAnalysis> = {},
): MistakeAnalysis {
  return {
    totalMistakes: 4,
    openMistakes: 2,
    resolvedMistakes: 2,
    resolutionRate: 50,
    dominantType: MistakeType.WRONG_WORD,
    dominantSeverity: MistakeSeverity.MODERATE,
    typeBreakdown: makeTypeBreakdown(),
    severityBreakdown: makeSeverityBreakdown(),
    mostProblematicSurah: null,
    topProblematicSurahs: [],
    recurringPatterns: [],
    hasCriticalOpenMistakes: false,
    mistakeRatePerAyah: 0.02,
    ...overrides,
  };
}

function makeDifficultyAnalysis(
  overrides: Partial<DifficultyAnalysis> = {},
): DifficultyAnalysis {
  return {
    difficultyIndex: 25,
    level: 'easy',
    averageSmEasinessFactor: 2.2,
    mistakeRatePerAyah: 0.02,
    weakGradeRate: 0.0,
    excellentGradeRate: 0.5,
    ...overrides,
  };
}

function makeInput(overrides: Partial<StudentProfileInput> = {}): StudentProfileInput {
  return {
    studentId: 'student-abc',
    tenantId: 'tenant-xyz',
    totalAyahsMemorized: 300,
    memorizationPercentage: 4.81,
    memorizationAnalysis: makeMemorizationAnalysis(),
    revisionAnalysis: makeRevisionAnalysis(),
    mistakeAnalysis: makeMistakeAnalysis(),
    difficultyAnalysis: makeDifficultyAnalysis(),
    attendance: { attendanceRate: 85 },
    ayahPerformance: {
      totalAyahs: 300,
      retainedAyahs: 240,
      averageSmEasinessFactor: 2.2,
    },
    ...overrides,
  };
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('StudentProfileEngine', () => {
  describe('identity fields', () => {
    it('passes studentId and tenantId through unchanged', () => {
      const p = engine.build(makeInput({ studentId: 'sid-1', tenantId: 'tid-2' }));
      expect(p.studentId).toBe('sid-1');
      expect(p.tenantId).toBe('tid-2');
    });

    it('sets generatedAt to a recent Date', () => {
      const before = Date.now();
      const p = engine.build(makeInput());
      expect(p.generatedAt).toBeInstanceOf(Date);
      expect(p.generatedAt.getTime()).toBeGreaterThanOrEqual(before);
    });
  });

  describe('score pass-through', () => {
    it('copies memorizationScore from MemorizationAnalysis', () => {
      const p = engine.build(makeInput({
        memorizationAnalysis: makeMemorizationAnalysis({ memorizationScore: 88 }),
      }));
      expect(p.memorizationScore).toBe(88);
    });

    it('copies revisionScore from RevisionAnalysis', () => {
      const p = engine.build(makeInput({
        revisionAnalysis: makeRevisionAnalysis({ revisionScore: 77 }),
      }));
      expect(p.revisionScore).toBe(77);
    });

    it('copies difficultyIndex from DifficultyAnalysis', () => {
      const p = engine.build(makeInput({
        difficultyAnalysis: makeDifficultyAnalysis({ difficultyIndex: 62 }),
      }));
      expect(p.difficultyIndex).toBe(62);
    });

    it('copies forgettingRisk from RevisionAnalysis', () => {
      for (const risk of ['low', 'medium', 'high'] as const) {
        const p = engine.build(makeInput({
          revisionAnalysis: makeRevisionAnalysis({ forgettingRisk: risk }),
        }));
        expect(p.forgettingRisk).toBe(risk);
      }
    });

    it('copies overdueRevisionCount from RevisionAnalysis', () => {
      const p = engine.build(makeInput({
        revisionAnalysis: makeRevisionAnalysis({ overdueCount: 42 }),
      }));
      expect(p.overdueRevisionCount).toBe(42);
    });

    it('copies revisionBurdenScore from RevisionAnalysis', () => {
      const p = engine.build(makeInput({
        revisionAnalysis: makeRevisionAnalysis({ revisionBurdenScore: 75 }),
      }));
      expect(p.revisionBurdenScore).toBe(75);
    });

    it('copies totalOpenMistakes from MistakeAnalysis', () => {
      const p = engine.build(makeInput({
        mistakeAnalysis: makeMistakeAnalysis({ openMistakes: 7 }),
      }));
      expect(p.totalOpenMistakes).toBe(7);
    });

    it('copies dominantMistakeType from MistakeAnalysis', () => {
      const p = engine.build(makeInput({
        mistakeAnalysis: makeMistakeAnalysis({ dominantType: MistakeType.SKIPPED_AYAH }),
      }));
      expect(p.dominantMistakeType).toBe(MistakeType.SKIPPED_AYAH);
    });

    it('passes null dominantMistakeType when there are no mistakes', () => {
      const p = engine.build(makeInput({
        mistakeAnalysis: makeMistakeAnalysis({ dominantType: null }),
      }));
      expect(p.dominantMistakeType).toBeNull();
    });

    it('copies mistakeResolutionRate from MistakeAnalysis', () => {
      const p = engine.build(makeInput({
        mistakeAnalysis: makeMistakeAnalysis({ resolutionRate: 80 }),
      }));
      expect(p.mistakeResolutionRate).toBe(80);
    });

    it('copies totalAyahsMemorized and memorizationPercentage from input', () => {
      const p = engine.build(makeInput({ totalAyahsMemorized: 500, memorizationPercentage: 8.01 }));
      expect(p.totalAyahsMemorized).toBe(500);
      expect(p.memorizationPercentage).toBe(8.01);
    });
  });

  describe('pace fields', () => {
    it('copies dailyPaceAyahs, weeklyPaceAyahs, activeDaysLast30 from MemorizationAnalysis', () => {
      const p = engine.build(makeInput({
        memorizationAnalysis: makeMemorizationAnalysis({
          dailyPaceAyahs: 7.5,
          weeklyPaceAyahs: 52.5,
          activeDaysLast30: 25,
        }),
      }));
      expect(p.dailyPaceAyahs).toBe(7.5);
      expect(p.weeklyPaceAyahs).toBe(52.5);
      expect(p.activeDaysLast30).toBe(25);
    });
  });

  // ── Derived fields ──────────────────────────────────────────────────────────

  describe('consistencyScore', () => {
    it('is activeDaysLast30 / 30 × 100, rounded', () => {
      const p = engine.build(makeInput({
        memorizationAnalysis: makeMemorizationAnalysis({ activeDaysLast30: 15 }),
      }));
      expect(p.consistencyScore).toBe(50);
    });

    it('caps at 100 even when activeDaysLast30 > 30', () => {
      // This can happen with timezone edge cases; must not exceed 100.
      const p = engine.build(makeInput({
        memorizationAnalysis: makeMemorizationAnalysis({ activeDaysLast30: 33 }),
      }));
      expect(p.consistencyScore).toBe(100);
    });

    it('is 0 when no active days', () => {
      const p = engine.build(makeInput({
        memorizationAnalysis: makeMemorizationAnalysis({ activeDaysLast30: 0 }),
      }));
      expect(p.consistencyScore).toBe(0);
    });

    it('is exactly 100 for 30 active days', () => {
      const p = engine.build(makeInput({
        memorizationAnalysis: makeMemorizationAnalysis({ activeDaysLast30: 30 }),
      }));
      expect(p.consistencyScore).toBe(100);
    });
  });

  describe('attendanceScore thresholds', () => {
    it('returns SCORE_EXCELLENT for attendance >= MIN_RATE_GOOD (80)', () => {
      for (const rate of [80, 90, 100]) {
        const p = engine.build(makeInput({ attendance: { attendanceRate: rate } }));
        expect(p.attendanceScore).toBe(AttendanceRules.SCORE_EXCELLENT);
      }
    });

    it('returns SCORE_ACCEPTABLE for attendance in [65, 80)', () => {
      for (const rate of [65, 70, 79]) {
        const p = engine.build(makeInput({ attendance: { attendanceRate: rate } }));
        expect(p.attendanceScore).toBe(AttendanceRules.SCORE_ACCEPTABLE);
      }
    });

    it('returns SCORE_LOW for attendance in [50, 65)', () => {
      for (const rate of [50, 55, 64]) {
        const p = engine.build(makeInput({ attendance: { attendanceRate: rate } }));
        expect(p.attendanceScore).toBe(AttendanceRules.SCORE_LOW);
      }
    });

    it('returns SCORE_CRITICAL for attendance below CRITICAL_RATE (50)', () => {
      for (const rate of [0, 30, 49]) {
        const p = engine.build(makeInput({ attendance: { attendanceRate: rate } }));
        expect(p.attendanceScore).toBe(AttendanceRules.SCORE_CRITICAL);
      }
    });
  });

  describe('retentionRate', () => {
    it('computes retainedAyahs / totalAyahs × 100, rounded', () => {
      const p = engine.build(makeInput({
        ayahPerformance: { totalAyahs: 200, retainedAyahs: 150, averageSmEasinessFactor: 2.3 },
      }));
      expect(p.retentionRate).toBe(75);
    });

    it('is 0 when totalAyahs is 0 (no ayah performance data yet)', () => {
      const p = engine.build(makeInput({
        ayahPerformance: { totalAyahs: 0, retainedAyahs: 0, averageSmEasinessFactor: 2.5 },
      }));
      expect(p.retentionRate).toBe(0);
    });

    it('is 100 when all ayahs are retained', () => {
      const p = engine.build(makeInput({
        ayahPerformance: { totalAyahs: 50, retainedAyahs: 50, averageSmEasinessFactor: 2.5 },
      }));
      expect(p.retentionRate).toBe(100);
    });

    it('rounds fractional retention rates', () => {
      // 10 / 3 × 100 = 333.3… → round → value should be an integer
      const p = engine.build(makeInput({
        ayahPerformance: { totalAyahs: 3, retainedAyahs: 1, averageSmEasinessFactor: 2.0 },
      }));
      expect(Number.isInteger(p.retentionRate)).toBe(true);
    });
  });

  describe('learningSpeed', () => {
    it('is totalAyahsMemorized / totalSessions, with one decimal', () => {
      const p = engine.build(makeInput({
        totalAyahsMemorized: 100,
        memorizationAnalysis: makeMemorizationAnalysis({ totalSessions: 20 }),
      }));
      expect(p.learningSpeed).toBe(5.0);
    });

    it('is 0 when there are no sessions', () => {
      const p = engine.build(makeInput({
        totalAyahsMemorized: 0,
        memorizationAnalysis: makeMemorizationAnalysis({ totalSessions: 0 }),
      }));
      expect(p.learningSpeed).toBe(0);
    });

    it('handles non-integer division with one decimal place', () => {
      const p = engine.build(makeInput({
        totalAyahsMemorized: 100,
        memorizationAnalysis: makeMemorizationAnalysis({ totalSessions: 30 }),
      }));
      // 100 / 30 ≈ 3.3
      expect(p.learningSpeed).toBeCloseTo(3.3, 1);
    });
  });

  describe('bestMemorizationTime', () => {
    it('returns "morning" for hours 5–11', () => {
      for (const h of [5, 8, 11]) {
        const p = engine.build(makeInput({
          memorizationAnalysis: makeMemorizationAnalysis({ bestHour: h }),
        }));
        expect(p.bestMemorizationTime).toBe('morning');
      }
    });

    it('returns "afternoon" for hours 12–17', () => {
      for (const h of [12, 15, 17]) {
        const p = engine.build(makeInput({
          memorizationAnalysis: makeMemorizationAnalysis({ bestHour: h }),
        }));
        expect(p.bestMemorizationTime).toBe('afternoon');
      }
    });

    it('returns "evening" for hours 18–23 and 0–4', () => {
      for (const h of [18, 20, 23, 0, 2, 4]) {
        const p = engine.build(makeInput({
          memorizationAnalysis: makeMemorizationAnalysis({ bestHour: h }),
        }));
        expect(p.bestMemorizationTime).toBe('evening');
      }
    });

    it('returns "unknown" when bestHour is null', () => {
      const p = engine.build(makeInput({
        memorizationAnalysis: makeMemorizationAnalysis({ bestHour: null }),
      }));
      expect(p.bestMemorizationTime).toBe('unknown');
    });
  });

  describe('bestRevisionTime', () => {
    it('returns "morning" for hours 5–11', () => {
      for (const h of [5, 7, 11]) {
        const p = engine.build(makeInput({
          revisionAnalysis: makeRevisionAnalysis({ bestHour: h }),
        }));
        expect(p.bestRevisionTime).toBe('morning');
      }
    });

    it('returns "afternoon" for hours 12–17', () => {
      for (const h of [12, 14, 17]) {
        const p = engine.build(makeInput({
          revisionAnalysis: makeRevisionAnalysis({ bestHour: h }),
        }));
        expect(p.bestRevisionTime).toBe('afternoon');
      }
    });

    it('returns "evening" for hours 18–23 and 0–4', () => {
      for (const h of [18, 22, 23, 0, 3]) {
        const p = engine.build(makeInput({
          revisionAnalysis: makeRevisionAnalysis({ bestHour: h }),
        }));
        expect(p.bestRevisionTime).toBe('evening');
      }
    });

    it('returns "unknown" when bestHour is null', () => {
      const p = engine.build(makeInput({
        revisionAnalysis: makeRevisionAnalysis({ bestHour: null }),
      }));
      expect(p.bestRevisionTime).toBe('unknown');
    });
  });

  describe('output contract', () => {
    it('returns scores bounded 0–100', () => {
      const p = engine.build(makeInput());
      for (const score of [
        p.memorizationScore, p.revisionScore, p.consistencyScore,
        p.attendanceScore, p.retentionRate, p.mistakeResolutionRate,
      ]) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });

    it('returns difficultyIndex bounded 0–100', () => {
      const p = engine.build(makeInput());
      expect(p.difficultyIndex).toBeGreaterThanOrEqual(0);
      expect(p.difficultyIndex).toBeLessThanOrEqual(100);
    });

    it('bestMemorizationTime is one of the four valid values', () => {
      const valid = ['morning', 'afternoon', 'evening', 'unknown'];
      const p = engine.build(makeInput());
      expect(valid).toContain(p.bestMemorizationTime);
    });

    it('bestRevisionTime is one of the four valid values', () => {
      const valid = ['morning', 'afternoon', 'evening', 'unknown'];
      const p = engine.build(makeInput());
      expect(valid).toContain(p.bestRevisionTime);
    });

    it('forgettingRisk is one of the three valid values', () => {
      const valid = ['low', 'medium', 'high'];
      const p = engine.build(makeInput());
      expect(valid).toContain(p.forgettingRisk);
    });

    it('learningSpeed is non-negative', () => {
      const p = engine.build(makeInput());
      expect(p.learningSpeed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('zero-state (brand-new student with no data)', () => {
    it('produces a fully defined profile with all zero numeric fields', () => {
      const p = engine.build(makeInput({
        totalAyahsMemorized: 0,
        memorizationPercentage: 0,
        memorizationAnalysis: makeMemorizationAnalysis({
          memorizationScore: 0,
          totalSessions: 0,
          activeDaysLast30: 0,
          dailyPaceAyahs: 0,
          weeklyPaceAyahs: 0,
          bestHour: null,
        }),
        revisionAnalysis: makeRevisionAnalysis({
          revisionScore: 0,
          overdueCount: 0,
          revisionBurdenScore: 0,
          forgettingRisk: 'low',
          bestHour: null,
        }),
        mistakeAnalysis: makeMistakeAnalysis({
          openMistakes: 0,
          dominantType: null,
          resolutionRate: 0,
        }),
        difficultyAnalysis: makeDifficultyAnalysis({ difficultyIndex: 0 }),
        attendance: { attendanceRate: 0 },
        ayahPerformance: { totalAyahs: 0, retainedAyahs: 0, averageSmEasinessFactor: 2.5 },
      }));

      expect(p.memorizationScore).toBe(0);
      expect(p.revisionScore).toBe(0);
      expect(p.consistencyScore).toBe(0);
      expect(p.learningSpeed).toBe(0);
      expect(p.retentionRate).toBe(0);
      expect(p.totalAyahsMemorized).toBe(0);
      expect(p.dailyPaceAyahs).toBe(0);
      expect(p.overdueRevisionCount).toBe(0);
      expect(p.totalOpenMistakes).toBe(0);
      expect(p.dominantMistakeType).toBeNull();
      expect(p.bestMemorizationTime).toBe('unknown');
      expect(p.bestRevisionTime).toBe('unknown');
    });
  });

  describe('high-performing student composite', () => {
    it('produces high scores and low risk for an excellent student', () => {
      const p = engine.build(makeInput({
        totalAyahsMemorized: 2000,
        memorizationPercentage: 32.1,
        memorizationAnalysis: makeMemorizationAnalysis({
          memorizationScore: 95,
          totalSessions: 200,
          activeDaysLast30: 28,
          dailyPaceAyahs: 10,
          weeklyPaceAyahs: 70,
          bestHour: 6,
        }),
        revisionAnalysis: makeRevisionAnalysis({
          revisionScore: 90,
          overdueCount: 2,
          revisionBurdenScore: 5,
          forgettingRisk: 'low',
          bestHour: 20,
        }),
        mistakeAnalysis: makeMistakeAnalysis({
          openMistakes: 0,
          dominantType: null,
          resolutionRate: 100,
        }),
        difficultyAnalysis: makeDifficultyAnalysis({ difficultyIndex: 10 }),
        attendance: { attendanceRate: 95 },
        ayahPerformance: { totalAyahs: 2000, retainedAyahs: 1900, averageSmEasinessFactor: 2.4 },
      }));

      expect(p.memorizationScore).toBe(95);
      expect(p.revisionScore).toBe(90);
      expect(p.consistencyScore).toBe(93); // round(28/30 * 100)
      expect(p.attendanceScore).toBe(AttendanceRules.SCORE_EXCELLENT);
      expect(p.forgettingRisk).toBe('low');
      expect(p.bestMemorizationTime).toBe('morning'); // hour 6
      expect(p.bestRevisionTime).toBe('evening');     // hour 20
      expect(p.retentionRate).toBe(95);               // 1900/2000
      expect(p.learningSpeed).toBe(10);               // 2000/200
    });
  });

  describe('at-risk student composite', () => {
    it('produces low scores and high risk for a struggling student', () => {
      const p = engine.build(makeInput({
        totalAyahsMemorized: 50,
        memorizationPercentage: 0.8,
        memorizationAnalysis: makeMemorizationAnalysis({
          memorizationScore: 20,
          totalSessions: 5,
          activeDaysLast30: 3,
          dailyPaceAyahs: 1,
          weeklyPaceAyahs: 7,
          bestHour: null,
        }),
        revisionAnalysis: makeRevisionAnalysis({
          revisionScore: 15,
          overdueCount: 40,
          revisionBurdenScore: 85,
          forgettingRisk: 'high',
          bestHour: null,
        }),
        mistakeAnalysis: makeMistakeAnalysis({
          openMistakes: 15,
          dominantType: MistakeType.WRONG_WORD,
          resolutionRate: 10,
        }),
        difficultyAnalysis: makeDifficultyAnalysis({ difficultyIndex: 80 }),
        attendance: { attendanceRate: 35 },
        ayahPerformance: { totalAyahs: 50, retainedAyahs: 10, averageSmEasinessFactor: 1.4 },
      }));

      expect(p.memorizationScore).toBe(20);
      expect(p.revisionScore).toBe(15);
      expect(p.consistencyScore).toBe(10); // round(3/30 * 100)
      expect(p.attendanceScore).toBe(AttendanceRules.SCORE_CRITICAL);
      expect(p.forgettingRisk).toBe('high');
      expect(p.overdueRevisionCount).toBe(40);
      expect(p.revisionBurdenScore).toBe(85);
      expect(p.totalOpenMistakes).toBe(15);
      expect(p.retentionRate).toBe(20);  // 10/50
      expect(p.bestMemorizationTime).toBe('unknown');
      expect(p.bestRevisionTime).toBe('unknown');
    });
  });
});
