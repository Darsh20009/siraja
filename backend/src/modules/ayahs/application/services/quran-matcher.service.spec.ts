import { QuranMatcherService } from './quran-matcher.service';
import { AYAH_REPOSITORY, AyahRecord } from '../../domain/repositories/ayah.repository.interface';

const basmala: AyahRecord = {
  id: '1',
  globalAyahNumber: 1,
  surahNumber: 1,
  ayahNumber: 1,
  pageNumber: 1,
  juzNumber: 1,
  hizbNumber: 1,
  arabicText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
};

const ayah2: AyahRecord = {
  id: '2',
  globalAyahNumber: 2,
  surahNumber: 1,
  ayahNumber: 2,
  pageNumber: 1,
  juzNumber: 1,
  hizbNumber: 1,
  arabicText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
};

function buildRepo(ayahs: AyahRecord[]) {
  const bysurah = new Map<number, AyahRecord[]>();
  for (const a of ayahs) {
    const arr = bysurah.get(a.surahNumber) ?? [];
    arr.push(a);
    bysurah.set(a.surahNumber, arr);
  }
  return {
    findBySurah: jest.fn(async (s: number) => bysurah.get(s) ?? []),
    findOne: jest.fn(async () => null),
    findByPage: jest.fn(async () => []),
    findByJuz: jest.fn(async () => []),
    searchByText: jest.fn(async () => []),
    upsert: jest.fn(async (i: any) => ({ ...i, id: 'x' })),
  };
}

describe('QuranMatcherService', () => {
  let service: QuranMatcherService;
  let repo: ReturnType<typeof buildRepo>;

  beforeEach(() => {
    repo = buildRepo([basmala, ayah2]);
    service = new QuranMatcherService(repo as any);
  });

  describe('empty / invalid inputs', () => {
    it('returns [] for empty query', async () => {
      expect(await service.matchAyah('')).toEqual([]);
    });

    it('returns [] for whitespace-only query', async () => {
      expect(await service.matchAyah('   ')).toEqual([]);
    });
  });

  describe('Tier 1 — exact normalized match', () => {
    it('returns a single exact match with confidence 1.0', async () => {
      // Query without tashkeel — normalizer strips diacritics from reference too
      const results = await service.matchAyah('بسم الله الرحمن الرحيم');
      expect(results).toHaveLength(1);
      expect(results[0].matchTier).toBe('exact');
      expect(results[0].confidence).toBe(1.0);
      expect(results[0].surahNumber).toBe(1);
      expect(results[0].ayahNumber).toBe(1);
    });

    it('returns exact match even with extra punctuation', async () => {
      const results = await service.matchAyah('بسم الله الرحمن الرحيم!');
      expect(results[0]?.matchTier).toBe('exact');
    });
  });

  describe('Tier 2 + 3 — text-index + fuzzy', () => {
    it('falls back to fuzzy when text-index returns candidates', async () => {
      // Make searchByText return basmala as a candidate
      repo.searchByText.mockResolvedValueOnce([basmala]);

      const results = await service.matchAyah('بسم الرحمن'); // partial
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].matchTier).toBe('fuzzy');
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.4);
    });

    it('returns results sorted by confidence descending', async () => {
      repo.searchByText.mockResolvedValueOnce([basmala, ayah2]);
      const results = await service.matchAyah('بسم الله');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
      }
    });

    it('respects minConfidence filter', async () => {
      repo.searchByText.mockResolvedValueOnce([basmala]);
      const results = await service.matchAyah('شيء مختلف تماما', { minConfidence: 0.99 });
      expect(results.every((r) => r.confidence >= 0.99)).toBe(true);
    });

    it('respects topN limit', async () => {
      repo.searchByText.mockResolvedValueOnce([basmala, ayah2]);
      const results = await service.matchAyah('بسم الله', { topN: 1 });
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('invalidateIndex', () => {
    it('clears the cached index so it reloads on next call', async () => {
      await service.matchAyah('بسم الله الرحمن الرحيم');
      const callsBefore = repo.findBySurah.mock.calls.length;
      service.invalidateIndex();
      await service.matchAyah('بسم الله الرحمن الرحيم');
      expect(repo.findBySurah.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  describe('result shape', () => {
    it('includes required fields on every result', async () => {
      const results = await service.matchAyah('بسم الله الرحمن الرحيم');
      expect(results[0]).toMatchObject({
        surahNumber: expect.any(Number),
        ayahNumber: expect.any(Number),
        globalAyahNumber: expect.any(Number),
        arabicText: expect.any(String),
        confidence: expect.any(Number),
        matchTier: expect.stringMatching(/^(exact|text-index|fuzzy)$/),
      });
    });
  });
});
