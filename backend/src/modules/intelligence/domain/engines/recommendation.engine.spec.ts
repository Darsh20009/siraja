import { EvaluationGrade, MistakeResolutionStatus, MistakeSeverity, MistakeType } from '@shared/enums/memorization.enum';
import { RecommendationEngine } from './recommendation.engine';
import { StudentIntelligenceProfile } from '../entities/student-intelligence-profile.entity';
import { MistakeAnalysis } from './mistake.engine';
import { RevisionAnalysis } from './revision.engine';
import { MemorizationAnalysis } from './memorization.engine';

const engine = new RecommendationEngine();

function makeProfile(overrides: Partial<StudentIntelligenceProfile> = {}): StudentIntelligenceProfile {
  return {
    studentId: 'student-1',
    tenantId: 'tenant-1',
    generatedAt: new Date(),
    memorizationScore: 70,
    revisionScore: 65,
    consistencyScore: 67,
    attendanceScore: 70,
    difficultyIndex: 30,
    forgettingRisk: 'low',
    bestMemorizationTime: 'morning',
    bestRevisionTime: 'evening',
    learningSpeed: 5,
    retentionRate: 75,
    dailyPaceAyahs: 5,
    weeklyPaceAyahs: 35,
    activeDaysLast30: 20,
    totalAyahsMemorized: 300,
    memorizationPercentage: 4.8,
    overdueRevisionCount: 5,
    revisionBurdenScore: 10,
    totalOpenMistakes: 2,
    dominantMistakeType: null,
    mistakeResolutionRate: 80,
    ...overrides,
  };
}

function makeMistakeAnalysis(overrides: Partial<MistakeAnalysis> = {}): MistakeAnalysis {
  const typeBreakdown = {} as Record<MistakeType, number>;
  for (const t of Object.values(MistakeType)) typeBreakdown[t] = 0;
  const severityBreakdown = {} as Record<MistakeSeverity, number>;
  for (const s of Object.values(MistakeSeverity)) severityBreakdown[s] = 0;
  return {
    totalMistakes: 2, openMistakes: 2, resolvedMistakes: 0, resolutionRate: 0,
    dominantType: null, dominantSeverity: null, typeBreakdown, severityBreakdown,
    mostProblematicSurah: null, topProblematicSurahs: [], recurringPatterns: [],
    hasCriticalOpenMistakes: false, mistakeRatePerAyah: 0.01,
    ...overrides,
  };
}

function makeRevisionAnalysis(overrides: Partial<RevisionAnalysis> = {}): RevisionAnalysis {
  return {
    revisionScore: 65, totalSessions: 10, totalAyahsRevised: 50,
    averageAyahsPerSession: 5, averageRetentionGrade: EvaluationGrade.GOOD,
    gradeBreakdown: {
      [EvaluationGrade.EXCELLENT]: 0, [EvaluationGrade.VERY_GOOD]: 0,
      [EvaluationGrade.GOOD]: 10, [EvaluationGrade.ACCEPTABLE]: 0,
      [EvaluationGrade.WEAK]: 0, ungraded: 0,
    },
    sessionsPerWeek: 2.5, overdueCount: 5, revisionBurdenScore: 10,
    forgettingRisk: 'low', onTimeRevisionRate: 90, trend: 'stable', bestHour: 9,
    ...overrides,
  };
}

function makeMemorizationAnalysis(overrides: Partial<MemorizationAnalysis> = {}): MemorizationAnalysis {
  return {
    memorizationScore: 70, averageScore: 75, averageAyahsPerSession: 5, totalSessions: 60,
    totalAyahsLast30: 100, activeDaysLast30: 20, dailyPaceAyahs: 5, weeklyPaceAyahs: 35,
    gradeDistribution: {
      [EvaluationGrade.EXCELLENT]: 0, [EvaluationGrade.VERY_GOOD]: 10,
      [EvaluationGrade.GOOD]: 40, [EvaluationGrade.ACCEPTABLE]: 10,
      [EvaluationGrade.WEAK]: 0, ungraded: 0,
    },
    trend: 'stable', bestDayOfWeek: 'Monday', bestHour: 8,
    ...overrides,
  };
}

describe('RecommendationEngine', () => {
  it('returns an array of recommendations', () => {
    const recs = engine.generate(
      makeProfile(), makeMistakeAnalysis(), makeRevisionAnalysis(), makeMemorizationAnalysis(),
    );
    expect(Array.isArray(recs)).toBe(true);
  });

  it('caps at 8 recommendations', () => {
    const recs = engine.generate(
      makeProfile({
        forgettingRisk: 'high', revisionBurdenScore: 70,
        attendanceScore: 15, activeDaysLast30: 0, totalAyahsMemorized: 100,
        dailyPaceAyahs: 1, consistencyScore: 0,
      }),
      makeMistakeAnalysis({ hasCriticalOpenMistakes: true }),
      makeRevisionAnalysis({ sessionsPerWeek: 1 }),
      makeMemorizationAnalysis({ trend: 'declining' }),
    );
    expect(recs.length).toBeLessThanOrEqual(8);
  });

  it('sorts high-priority recommendations first', () => {
    const recs = engine.generate(
      makeProfile({ forgettingRisk: 'high' }),
      makeMistakeAnalysis(),
      makeRevisionAnalysis(),
      makeMemorizationAnalysis(),
    );
    if (recs.length > 1) {
      const firstMedium = recs.findIndex(r => r.priority === 'medium');
      const lastHigh = recs.map(r => r.priority).lastIndexOf('high');
      if (firstMedium !== -1 && lastHigh !== -1) {
        expect(lastHigh).toBeLessThan(firstMedium);
      }
    }
  });

  it('fires "revision.high_forgetting_risk" when forgettingRisk is high', () => {
    const recs = engine.generate(
      makeProfile({ forgettingRisk: 'high', overdueRevisionCount: 30 }),
      makeMistakeAnalysis(),
      makeRevisionAnalysis({ overdueCount: 30 }),
      makeMemorizationAnalysis(),
    );
    expect(recs.some(r => r.triggeredBy === 'revision.high_forgetting_risk')).toBe(true);
  });

  it('fires "tajweed.critical_open_mistakes" when hasCriticalOpenMistakes is true', () => {
    const recs = engine.generate(
      makeProfile(),
      makeMistakeAnalysis({ hasCriticalOpenMistakes: true, openMistakes: 4 }),
      makeRevisionAnalysis(),
      makeMemorizationAnalysis(),
    );
    expect(recs.some(r => r.triggeredBy === 'tajweed.critical_open_mistakes')).toBe(true);
  });

  it('fires "revision.high_burden" when burden >= 60', () => {
    const recs = engine.generate(
      makeProfile({ revisionBurdenScore: 65 }),
      makeMistakeAnalysis(),
      makeRevisionAnalysis({ revisionBurdenScore: 65 }),
      makeMemorizationAnalysis(),
    );
    expect(recs.some(r => r.triggeredBy === 'revision.high_burden')).toBe(true);
  });

  it('fires "memorization.inactivity" for a student with ayahs but no recent activity', () => {
    const recs = engine.generate(
      makeProfile({ activeDaysLast30: 0, totalAyahsMemorized: 500 }),
      makeMistakeAnalysis(),
      makeRevisionAnalysis(),
      makeMemorizationAnalysis({ activeDaysLast30: 0 }),
    );
    expect(recs.some(r => r.triggeredBy === 'memorization.inactivity')).toBe(true);
  });

  it('all recommendations have required fields', () => {
    const recs = engine.generate(
      makeProfile(), makeMistakeAnalysis(), makeRevisionAnalysis(), makeMemorizationAnalysis(),
    );
    for (const rec of recs) {
      expect(rec.type).toBeDefined();
      expect(rec.priority).toBeDefined();
      expect(rec.title.length).toBeGreaterThan(0);
      expect(rec.description.length).toBeGreaterThan(0);
      expect(rec.triggeredBy.length).toBeGreaterThan(0);
      expect(typeof rec.actionable).toBe('boolean');
    }
  });
});
