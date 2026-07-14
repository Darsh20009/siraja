import { Sm2Engine, Sm2State } from './sm2.engine';
import { EvaluationGrade } from '@shared/enums/memorization.enum';

describe('Sm2Engine', () => {
  let engine: Sm2Engine;

  beforeEach(() => {
    engine = new Sm2Engine();
  });

  // ── initialState ───────────────────────────────────────────────────────
  describe('initialState', () => {
    it('returns default SM-2 state', () => {
      const state = engine.initialState();
      expect(state.smEasinessFactor).toBe(2.5);
      expect(state.smInterval).toBe(0);
      expect(state.smRepetitions).toBe(0);
      expect(state.smNextReviewDue).toBeNull();
    });
  });

  // ── onSuccess — first repetition ────────────────────────────────────────
  describe('onSuccess — first repetition (rep=0)', () => {
    it('sets interval to 1 day on EXCELLENT first attempt', () => {
      const state = engine.onSuccess(engine.initialState(), EvaluationGrade.EXCELLENT);
      expect(state.smInterval).toBe(1);
      expect(state.smRepetitions).toBe(1);
      // EF is clamped to 2.5 max; starting from default 2.5, it stays at 2.5
      expect(state.smEasinessFactor).toBeGreaterThanOrEqual(2.5);
    });

    it('sets interval to 1 day on GOOD (q=3) first attempt', () => {
      const state = engine.onSuccess(engine.initialState(), EvaluationGrade.GOOD);
      expect(state.smInterval).toBe(1);
      expect(state.smRepetitions).toBe(1);
    });

    it('sets next review due to tomorrow', () => {
      const state = engine.onSuccess(engine.initialState(), EvaluationGrade.GOOD);
      expect(state.smNextReviewDue).not.toBeNull();
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      expect(state.smNextReviewDue!.getUTCDate()).toBe(tomorrow.getUTCDate());
    });
  });

  // ── onSuccess — second repetition ──────────────────────────────────────
  describe('onSuccess — second repetition (rep=1)', () => {
    it('sets interval to 6 days on rep=1', () => {
      const afterFirst = engine.onSuccess(engine.initialState(), EvaluationGrade.EXCELLENT);
      const afterSecond = engine.onSuccess(afterFirst, EvaluationGrade.EXCELLENT);
      expect(afterSecond.smInterval).toBe(6);
      expect(afterSecond.smRepetitions).toBe(2);
    });
  });

  // ── onSuccess — subsequent repetitions ─────────────────────────────────
  describe('onSuccess — subsequent repetitions (rep >= 2)', () => {
    it('multiplies interval by EF', () => {
      let state = engine.initialState();
      state = engine.onSuccess(state, EvaluationGrade.EXCELLENT); // interval=1, rep=1
      state = engine.onSuccess(state, EvaluationGrade.EXCELLENT); // interval=6, rep=2
      const prevInterval = state.smInterval;
      const prevEF = state.smEasinessFactor;
      state = engine.onSuccess(state, EvaluationGrade.EXCELLENT); // interval = round(6 * EF)
      expect(state.smInterval).toBe(Math.round(prevInterval * prevEF));
      expect(state.smRepetitions).toBe(3);
    });

    it('interval grows substantially after several repetitions', () => {
      let state = engine.initialState();
      for (let i = 0; i < 5; i++) {
        state = engine.onSuccess(state, EvaluationGrade.EXCELLENT);
      }
      expect(state.smInterval).toBeGreaterThan(20);
    });
  });

  // ── EF bounds ──────────────────────────────────────────────────────────
  describe('EF bounds', () => {
    it('EF never drops below 1.3 even with all GOOD grades', () => {
      let state = engine.initialState();
      for (let i = 0; i < 20; i++) {
        state = engine.onSuccess(state, EvaluationGrade.GOOD);
      }
      expect(state.smEasinessFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('EF never exceeds 2.5', () => {
      let state: Sm2State = { ...engine.initialState(), smEasinessFactor: 2.5 };
      state = engine.onSuccess(state, EvaluationGrade.EXCELLENT);
      expect(state.smEasinessFactor).toBeLessThanOrEqual(2.5);
    });
  });

  // ── ACCEPTABLE (q=2) partial credit ─────────────────────────────────────
  describe('ACCEPTABLE grade — partial credit', () => {
    it('keeps repetitions unchanged and inflates interval', () => {
      let state = engine.initialState();
      state = engine.onSuccess(state, EvaluationGrade.EXCELLENT); // rep=1, interval=1
      state = engine.onSuccess(state, EvaluationGrade.EXCELLENT); // rep=2, interval=6
      const repBefore = state.smRepetitions;
      const newState = engine.onSuccess(state, EvaluationGrade.ACCEPTABLE);
      expect(newState.smRepetitions).toBe(repBefore); // unchanged
      expect(newState.smInterval).toBeGreaterThan(1); // inflated by 1.2x
    });
  });

  // ── onMistake ─────────────────────────────────────────────────────────
  describe('onMistake', () => {
    it('resets repetitions to 0 and interval to 1', () => {
      let state = engine.initialState();
      state = engine.onSuccess(state, EvaluationGrade.EXCELLENT);
      state = engine.onSuccess(state, EvaluationGrade.EXCELLENT);
      state = engine.onSuccess(state, EvaluationGrade.EXCELLENT); // built up rep/interval
      const reset = engine.onMistake(state);
      expect(reset.smRepetitions).toBe(0);
      expect(reset.smInterval).toBe(1);
    });

    it('preserves EF on mistake', () => {
      let state = engine.initialState();
      for (let i = 0; i < 3; i++) state = engine.onSuccess(state, EvaluationGrade.EXCELLENT);
      const ef = state.smEasinessFactor;
      const reset = engine.onMistake(state);
      expect(reset.smEasinessFactor).toBe(ef);
    });

    it('schedules next review for tomorrow', () => {
      const state = engine.onMistake(engine.initialState());
      expect(state.smNextReviewDue).not.toBeNull();
    });
  });

  // ── WEAK grade treated as failure ──────────────────────────────────────
  describe('WEAK grade treated as failure', () => {
    it('resets repetitions to 0 when WEAK grade provided', () => {
      let state = engine.initialState();
      state = engine.onSuccess(state, EvaluationGrade.EXCELLENT);
      state = engine.onSuccess(state, EvaluationGrade.EXCELLENT);
      const weakResult = engine.onSuccess(state, EvaluationGrade.WEAK);
      expect(weakResult.smRepetitions).toBe(0);
      expect(weakResult.smInterval).toBe(1);
    });
  });
});
