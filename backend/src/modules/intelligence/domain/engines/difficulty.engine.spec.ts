import { EvaluationGrade } from '@shared/enums/memorization.enum';
import { DifficultyEngine, DifficultyInput } from './difficulty.engine';

const engine = new DifficultyEngine();

function makeInput(overrides: Partial<DifficultyInput> = {}): DifficultyInput {
  return {
    gradeDistribution: {
      [EvaluationGrade.EXCELLENT]: 0,
      [EvaluationGrade.VERY_GOOD]: 0,
      [EvaluationGrade.GOOD]: 10,
      [EvaluationGrade.ACCEPTABLE]: 0,
      [EvaluationGrade.WEAK]: 0,
      ungraded: 0,
    },
    totalSessions: 10,
    totalMistakes: 5,
    averageSmEasinessFactor: 2.1,
    mistakeRatePerAyah: 0.05,
    averageScore: 70,
    ...overrides,
  };
}

describe('DifficultyEngine', () => {
  it('returns a difficultyIndex between 0 and 100', () => {
    const r = engine.analyse(makeInput());
    expect(r.difficultyIndex).toBeGreaterThanOrEqual(0);
    expect(r.difficultyIndex).toBeLessThanOrEqual(100);
  });

  it('classifies an excellent student as "easy"', () => {
    const input = makeInput({
      gradeDistribution: {
        [EvaluationGrade.EXCELLENT]: 10,
        [EvaluationGrade.VERY_GOOD]: 5,
        [EvaluationGrade.GOOD]: 0,
        [EvaluationGrade.ACCEPTABLE]: 0,
        [EvaluationGrade.WEAK]: 0,
        ungraded: 0,
      },
      averageSmEasinessFactor: 2.4,
      mistakeRatePerAyah: 0.01,
      averageScore: 97,
    });
    const r = engine.analyse(input);
    expect(['easy', 'moderate']).toContain(r.level);
  });

  it('classifies a struggling student as "challenging" or "difficult"', () => {
    const input = makeInput({
      gradeDistribution: {
        [EvaluationGrade.EXCELLENT]: 0,
        [EvaluationGrade.VERY_GOOD]: 0,
        [EvaluationGrade.GOOD]: 0,
        [EvaluationGrade.ACCEPTABLE]: 5,
        [EvaluationGrade.WEAK]: 10,
        ungraded: 0,
      },
      averageSmEasinessFactor: 1.4,
      mistakeRatePerAyah: 0.30,
      averageScore: 30,
    });
    const r = engine.analyse(input);
    expect(['challenging', 'difficult']).toContain(r.level);
  });

  it('produces a higher difficultyIndex for a weak student than a strong one', () => {
    const strong = engine.analyse(makeInput({ averageScore: 95, averageSmEasinessFactor: 2.4, mistakeRatePerAyah: 0.01 }));
    const weak = engine.analyse(makeInput({ averageScore: 30, averageSmEasinessFactor: 1.4, mistakeRatePerAyah: 0.25 }));
    expect(weak.difficultyIndex).toBeGreaterThan(strong.difficultyIndex);
  });
});
