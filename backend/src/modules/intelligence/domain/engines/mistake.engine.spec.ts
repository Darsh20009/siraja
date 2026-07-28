import { MistakeResolutionStatus, MistakeSeverity, MistakeType } from '@shared/enums/memorization.enum';
import { MistakeEngine, MistakeData } from './mistake.engine';

const engine = new MistakeEngine();

function makeMistake(overrides: Partial<MistakeData> & { id: string }): MistakeData {
  return {
    id: overrides.id,
    surahNumber: overrides.surahNumber ?? 2,
    ayahNumber: overrides.ayahNumber ?? 1,
    type: overrides.type ?? MistakeType.WRONG_WORD,
    severity: overrides.severity ?? MistakeSeverity.MINOR,
    resolutionStatus: overrides.resolutionStatus ?? MistakeResolutionStatus.OPEN,
    createdAt: overrides.createdAt ?? new Date(),
  };
}

describe('MistakeEngine', () => {
  describe('analyse([]) — empty', () => {
    it('returns zero counts and 100% resolution rate', () => {
      const r = engine.analyse([], 0);
      expect(r.totalMistakes).toBe(0);
      expect(r.openMistakes).toBe(0);
      expect(r.resolutionRate).toBe(100);
      expect(r.dominantType).toBeNull();
      expect(r.hasCriticalOpenMistakes).toBe(false);
    });
  });

  describe('resolution rate', () => {
    it('calculates correctly when some resolved', () => {
      const mistakes: MistakeData[] = [
        makeMistake({ id: '1', resolutionStatus: MistakeResolutionStatus.RESOLVED }),
        makeMistake({ id: '2', resolutionStatus: MistakeResolutionStatus.RESOLVED }),
        makeMistake({ id: '3', resolutionStatus: MistakeResolutionStatus.OPEN }),
        makeMistake({ id: '4', resolutionStatus: MistakeResolutionStatus.OPEN }),
      ];
      const r = engine.analyse(mistakes, 100);
      expect(r.resolutionRate).toBe(50);
      expect(r.resolvedMistakes).toBe(2);
      expect(r.openMistakes).toBe(2);
    });
  });

  describe('dominant type', () => {
    it('identifies the most frequent mistake type', () => {
      const mistakes: MistakeData[] = [
        makeMistake({ id: '1', type: MistakeType.WRONG_WORD }),
        makeMistake({ id: '2', type: MistakeType.WRONG_WORD }),
        makeMistake({ id: '3', type: MistakeType.WRONG_WORD }),
        makeMistake({ id: '4', type: MistakeType.MISSING_WORD }),
      ];
      const r = engine.analyse(mistakes, 50);
      expect(r.dominantType).toBe(MistakeType.WRONG_WORD);
    });
  });

  describe('critical open mistakes', () => {
    it('flags hasCriticalOpenMistakes when 3+ critical mistakes open', () => {
      const mistakes: MistakeData[] = Array.from({ length: 3 }, (_, i) =>
        makeMistake({
          id: String(i),
          type: MistakeType.SKIPPED_AYAH,
          severity: MistakeSeverity.MAJOR,
          resolutionStatus: MistakeResolutionStatus.OPEN,
        }),
      );
      const r = engine.analyse(mistakes, 100);
      expect(r.hasCriticalOpenMistakes).toBe(true);
    });

    it('does not flag when all critical are resolved', () => {
      const mistakes: MistakeData[] = Array.from({ length: 3 }, (_, i) =>
        makeMistake({
          id: String(i),
          type: MistakeType.SKIPPED_AYAH,
          severity: MistakeSeverity.MAJOR,
          resolutionStatus: MistakeResolutionStatus.RESOLVED,
        }),
      );
      const r = engine.analyse(mistakes, 100);
      expect(r.hasCriticalOpenMistakes).toBe(false);
    });
  });

  describe('recurring patterns', () => {
    it('identifies types appearing RECURRENCE_THRESHOLD+ times', () => {
      const mistakes: MistakeData[] = Array.from({ length: 4 }, (_, i) =>
        makeMistake({ id: String(i), type: MistakeType.WRONG_WORD }),
      );
      const r = engine.analyse(mistakes, 100);
      expect(r.recurringPatterns).toContain(MistakeType.WRONG_WORD);
    });
  });

  describe('most problematic surah', () => {
    it('returns the surah with the most mistakes', () => {
      const mistakes: MistakeData[] = [
        ...Array.from({ length: 5 }, (_, i) => makeMistake({ id: `s2-${i}`, surahNumber: 2 })),
        ...Array.from({ length: 2 }, (_, i) => makeMistake({ id: `s3-${i}`, surahNumber: 3 })),
      ];
      const r = engine.analyse(mistakes, 100);
      expect(r.mostProblematicSurah?.surahNumber).toBe(2);
    });
  });
});
