import { MistakeResolutionStatus, MistakeSeverity, MistakeType } from '@shared/enums/memorization.enum';
import { TajweedRules } from '../rules/tajweed.rules';

export interface MistakeData {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  type: MistakeType;
  severity: MistakeSeverity;
  resolutionStatus: MistakeResolutionStatus;
  createdAt: Date;
}

export interface SurahMistakeSummary {
  surahNumber: number;
  count: number;
  dominantType: MistakeType;
  criticalCount: number;
}

export interface MistakeAnalysis {
  totalMistakes: number;
  openMistakes: number;
  resolvedMistakes: number;
  resolutionRate: number;
  dominantType: MistakeType | null;
  dominantSeverity: MistakeSeverity | null;
  typeBreakdown: Record<MistakeType, number>;
  severityBreakdown: Record<MistakeSeverity, number>;
  /** Ayahs/surahs with highest mistake concentration. */
  mostProblematicSurah: SurahMistakeSummary | null;
  topProblematicSurahs: SurahMistakeSummary[];
  /** Recurring pattern: mistake type appearing ≥ RECURRENCE_THRESHOLD times. */
  recurringPatterns: MistakeType[];
  hasCriticalOpenMistakes: boolean;
  mistakeRatePerAyah: number;
}

/**
 * MistakeEngine — pure, dependency-free.
 *
 * Performs structural and Tajweed-pattern analysis on a list of mistake
 * records. No NestJS injection; fully unit-testable.
 */
export class MistakeEngine {
  analyse(mistakes: MistakeData[], totalAyahsMemorized: number): MistakeAnalysis {
    if (mistakes.length === 0) {
      return this.empty();
    }

    const openMistakes = mistakes.filter(m => m.resolutionStatus === MistakeResolutionStatus.OPEN);
    const resolvedMistakes = mistakes.length - openMistakes.length;
    const resolutionRate = Math.round((resolvedMistakes / mistakes.length) * 100);

    // ── Type breakdown ────────────────────────────────────────────────────────
    const typeBreakdown: Record<string, number> = {};
    for (const t of Object.values(MistakeType)) typeBreakdown[t] = 0;
    for (const m of mistakes) typeBreakdown[m.type]++;

    // ── Severity breakdown ────────────────────────────────────────────────────
    const severityBreakdown: Record<string, number> = {};
    for (const s of Object.values(MistakeSeverity)) severityBreakdown[s] = 0;
    for (const m of mistakes) severityBreakdown[m.severity]++;

    // ── Dominant type/severity ────────────────────────────────────────────────
    const dominantType = this.maxKey(typeBreakdown) as MistakeType | null;
    const dominantSeverity = this.maxKey(severityBreakdown) as MistakeSeverity | null;

    // ── Per-surah breakdown ───────────────────────────────────────────────────
    const surahMap = new Map<number, { counts: Record<string, number>; critical: number }>();
    for (const m of mistakes) {
      if (!surahMap.has(m.surahNumber)) {
        surahMap.set(m.surahNumber, { counts: {}, critical: 0 });
      }
      const entry = surahMap.get(m.surahNumber)!;
      entry.counts[m.type] = (entry.counts[m.type] ?? 0) + 1;
      if (TajweedRules.CRITICAL_MISTAKE_TYPES.includes(m.type)) entry.critical++;
    }

    const surahSummaries: SurahMistakeSummary[] = [...surahMap.entries()].map(([surahNumber, data]) => ({
      surahNumber,
      count: Object.values(data.counts).reduce((a, b) => a + b, 0),
      dominantType: (this.maxKey(data.counts) ?? MistakeType.OTHER) as MistakeType,
      criticalCount: data.critical,
    }));

    surahSummaries.sort((a, b) => b.count - a.count);
    const mostProblematicSurah = surahSummaries[0] ?? null;
    const topProblematicSurahs = surahSummaries.slice(0, 5);

    // ── Recurring patterns ────────────────────────────────────────────────────
    const recurringPatterns = Object.entries(typeBreakdown)
      .filter(([, count]) => count >= TajweedRules.RECURRENCE_THRESHOLD)
      .map(([type]) => type as MistakeType);

    // ── Critical open mistakes ────────────────────────────────────────────────
    const criticalOpenCount = openMistakes.filter(m =>
      TajweedRules.CRITICAL_MISTAKE_TYPES.includes(m.type) ||
      m.severity === MistakeSeverity.MAJOR,
    ).length;

    const hasCriticalOpenMistakes = criticalOpenCount >= TajweedRules.CRITICAL_OPEN_MISTAKES_THRESHOLD;

    // ── Mistake rate ─────────────────────────────────────────────────────────
    const mistakeRatePerAyah = totalAyahsMemorized > 0
      ? parseFloat((mistakes.length / totalAyahsMemorized).toFixed(3))
      : 0;

    return {
      totalMistakes: mistakes.length,
      openMistakes: openMistakes.length,
      resolvedMistakes,
      resolutionRate,
      dominantType,
      dominantSeverity,
      typeBreakdown: typeBreakdown as Record<MistakeType, number>,
      severityBreakdown: severityBreakdown as Record<MistakeSeverity, number>,
      mostProblematicSurah,
      topProblematicSurahs,
      recurringPatterns,
      hasCriticalOpenMistakes,
      mistakeRatePerAyah,
    };
  }

  private maxKey(record: Record<string, number>): string | null {
    let maxKey: string | null = null;
    let maxVal = -1;
    for (const [k, v] of Object.entries(record)) {
      if (v > maxVal) { maxVal = v; maxKey = k; }
    }
    return maxVal > 0 ? maxKey : null;
  }

  private empty(): MistakeAnalysis {
    const typeBreakdown: Record<string, number> = {};
    for (const t of Object.values(MistakeType)) typeBreakdown[t] = 0;
    const severityBreakdown: Record<string, number> = {};
    for (const s of Object.values(MistakeSeverity)) severityBreakdown[s] = 0;
    return {
      totalMistakes: 0, openMistakes: 0, resolvedMistakes: 0, resolutionRate: 100,
      dominantType: null, dominantSeverity: null,
      typeBreakdown: typeBreakdown as Record<MistakeType, number>,
      severityBreakdown: severityBreakdown as Record<MistakeSeverity, number>,
      mostProblematicSurah: null, topProblematicSurahs: [],
      recurringPatterns: [], hasCriticalOpenMistakes: false, mistakeRatePerAyah: 0,
    };
  }
}
