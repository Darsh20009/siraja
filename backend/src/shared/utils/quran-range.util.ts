import { IAyahRepository } from '@modules/ayahs/domain/repositories/ayah.repository.interface';

export interface QuranRangeLike {
  surahFrom: number;
  ayahFrom: number;
  surahTo: number;
  ayahTo: number;
}

/**
 * Expands a memorization/review range (which may span multiple surahs)
 * into the individual (surahNumber, ayahNumber) pairs it covers. Needed
 * because the Smart Mushaf Engine (Phase 9) tracks performance per ayah,
 * while `memorization_records`/`review_records` (Phase 7) store ranges.
 * Uses `IAyahRepository.findBySurah` to know each surah's true ayah
 * count rather than hardcoding it.
 */
export async function resolveAyahsInRange(
  ayahRepo: IAyahRepository,
  range: QuranRangeLike,
): Promise<{ surahNumber: number; ayahNumber: number }[]> {
  const result: { surahNumber: number; ayahNumber: number }[] = [];

  if (range.surahFrom === range.surahTo) {
    for (let ayahNumber = range.ayahFrom; ayahNumber <= range.ayahTo; ayahNumber++) {
      result.push({ surahNumber: range.surahFrom, ayahNumber });
    }
    return result;
  }

  for (let surahNumber = range.surahFrom; surahNumber <= range.surahTo; surahNumber++) {
    const ayahs = await ayahRepo.findBySurah(surahNumber);
    const from = surahNumber === range.surahFrom ? range.ayahFrom : 1;
    const to = surahNumber === range.surahTo ? range.ayahTo : Number.MAX_SAFE_INTEGER;
    for (const ayah of ayahs) {
      if (ayah.ayahNumber >= from && ayah.ayahNumber <= to) {
        result.push({ surahNumber, ayahNumber: ayah.ayahNumber });
      }
    }
  }
  return result;
}
