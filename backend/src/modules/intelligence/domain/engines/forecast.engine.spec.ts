import { ForecastEngine, ForecastInput } from './forecast.engine';

const engine = new ForecastEngine();

function makeInput(overrides: Partial<ForecastInput> = {}): ForecastInput {
  return {
    totalAyahsMemorized: 1000,
    dailyPaceAyahs: 5,
    activeDaysLast30: 20,
    overdueRevisionCount: 10,
    revisionBurdenScore: 20,
    consistencyScore: 67,
    ...overrides,
  };
}

describe('ForecastEngine', () => {
  it('computes estimatedDaysRemaining correctly', () => {
    const r = engine.compute(makeInput({ totalAyahsMemorized: 1000, dailyPaceAyahs: 5 }));
    // (6236 - 1000) / 5 = 1047.2 → 1048
    expect(r.estimatedDaysRemaining).toBe(Math.ceil(5236 / 5));
    expect(r.remainingAyahs).toBe(5236);
  });

  it('returns zero days remaining and today for complete Quran', () => {
    const r = engine.compute(makeInput({ totalAyahsMemorized: 6236 }));
    expect(r.estimatedDaysRemaining).toBe(0);
    expect(r.remainingAyahs).toBe(0);
    expect(r.estimatedCompletionDate).toBeTruthy();
  });

  it('returns null forecast for inactive student', () => {
    const r = engine.compute(makeInput({ dailyPaceAyahs: 0 }));
    expect(r.estimatedDaysRemaining).toBeNull();
    expect(r.estimatedCompletionDate).toBeNull();
    expect(r.paceLabel).toBe('inactive');
  });

  it('classifies completion risk as "on-track" for consistent student', () => {
    const r = engine.compute(makeInput({
      dailyPaceAyahs: 7, consistencyScore: 80, revisionBurdenScore: 15,
    }));
    expect(r.completionRisk).toBe('on-track');
  });

  it('classifies completion risk as "at-risk" for high burden', () => {
    const r = engine.compute(makeInput({ revisionBurdenScore: 65 }));
    expect(r.completionRisk).toBe('at-risk');
  });

  it('classifies completion risk as "behind" for inactive student', () => {
    const r = engine.compute(makeInput({ dailyPaceAyahs: 0, consistencyScore: 0 }));
    expect(r.completionRisk).toBe('behind');
  });

  it('adjustedDaysRemaining is greater than raw when burden is high', () => {
    const r = engine.compute(makeInput({ dailyPaceAyahs: 5, revisionBurdenScore: 80 }));
    if (r.estimatedDaysRemaining !== null && r.adjustedDaysRemaining !== null) {
      expect(r.adjustedDaysRemaining).toBeGreaterThan(r.estimatedDaysRemaining);
    }
  });

  it('computes weeklyRevisionNeededToClearBacklog', () => {
    const r = engine.compute(makeInput({ overdueRevisionCount: 40 }));
    expect(r.weeklyRevisionNeededToClearBacklog).toBe(10); // ceil(40/4)
  });

  it('sets pace labels correctly', () => {
    expect(engine.compute(makeInput({ dailyPaceAyahs: 0 })).paceLabel).toBe('inactive');
    expect(engine.compute(makeInput({ dailyPaceAyahs: 1 })).paceLabel).toBe('slow');
    expect(engine.compute(makeInput({ dailyPaceAyahs: 5 })).paceLabel).toBe('good');
    expect(engine.compute(makeInput({ dailyPaceAyahs: 15 })).paceLabel).toBe('excellent');
  });
});
