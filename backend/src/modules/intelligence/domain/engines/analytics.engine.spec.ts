import { AnalyticsEngine } from './analytics.engine';
import { StudentIntelligenceProfile } from '../entities/student-intelligence-profile.entity';

const engine = new AnalyticsEngine();

function makeProfile(studentId: string, overrides: Partial<StudentIntelligenceProfile> = {}): StudentIntelligenceProfile {
  return {
    studentId,
    tenantId: 'tenant-1',
    generatedAt: new Date(),
    memorizationScore: 70,
    revisionScore: 65,
    consistencyScore: 60,
    attendanceScore: 75,
    difficultyIndex: 30,
    forgettingRisk: 'low',
    bestMemorizationTime: 'morning',
    bestRevisionTime: 'evening',
    learningSpeed: 5,
    retentionRate: 72,
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

describe('AnalyticsEngine', () => {
  describe('aggregateClass([])', () => {
    it('returns zeroed analytics for empty class', () => {
      const r = engine.aggregateClass([]);
      expect(r.totalStudents).toBe(0);
      expect(r.averageMemorizationScore).toBe(0);
      expect(r.topPerformers).toHaveLength(0);
      expect(r.needsAttention).toHaveLength(0);
    });
  });

  describe('aggregateClass() — basic', () => {
    const profiles = [
      makeProfile('s1', { memorizationScore: 90, revisionScore: 85, forgettingRisk: 'low', attendanceScore: 90 }),
      makeProfile('s2', { memorizationScore: 50, revisionScore: 40, forgettingRisk: 'high', attendanceScore: 60 }),
      makeProfile('s3', { memorizationScore: 70, revisionScore: 65, forgettingRisk: 'medium', attendanceScore: 75 }),
    ];

    it('computes correct total students', () => {
      const r = engine.aggregateClass(profiles);
      expect(r.totalStudents).toBe(3);
    });

    it('computes average memorization score', () => {
      const r = engine.aggregateClass(profiles);
      expect(r.averageMemorizationScore).toBeCloseTo(70, 0);
    });

    it('identifies top performers', () => {
      const r = engine.aggregateClass(profiles);
      expect(r.topPerformers[0]).toBe('s1');
    });

    it('flags students with high forgetting risk in needsAttention', () => {
      const r = engine.aggregateClass(profiles);
      expect(r.needsAttention).toContain('s2');
    });

    it('counts studentsWithHighForgettingRisk correctly', () => {
      const r = engine.aggregateClass(profiles);
      expect(r.studentsWithHighForgettingRisk).toBe(1);
    });

    it('sums totalOpenMistakes across all students', () => {
      const r = engine.aggregateClass(profiles);
      expect(r.totalOpenMistakes).toBe(6); // 2 per student × 3
    });
  });

  describe('performance tiers', () => {
    it('categorises students into correct tiers', () => {
      const profiles = [
        makeProfile('a', { memorizationScore: 90 }), // excellent
        makeProfile('b', { memorizationScore: 72 }), // good
        makeProfile('c', { memorizationScore: 55 }), // average
        makeProfile('d', { memorizationScore: 30 }), // struggling
      ];
      const r = engine.aggregateClass(profiles);
      expect(r.performanceTiers.excellent).toBe(1);
      expect(r.performanceTiers.good).toBe(1);
      expect(r.performanceTiers.average).toBe(1);
      expect(r.performanceTiers.struggling).toBe(1);
    });
  });
});
