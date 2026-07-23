import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QuranRange } from '@database/mongoose/schemas';
import {
  IStudentProgressRepository,
  STUDENT_PROGRESS_REPOSITORY,
} from '../../domain/repositories/student-progress.repository.interface';
import {
  MemorizationRecord,
  MemorizationRecordDocument,
  ReviewRecord,
  ReviewRecordDocument,
} from '@database/mongoose/schemas';
import { MemorizationStatus } from '@shared/enums/memorization.enum';

/** Total ayahs in the full Quran. Used for percentage calculation. */
const TOTAL_QURAN_AYAHS = 6236;
/** Approximate ayahs per page (604 pages). */
const AYAHS_PER_PAGE = TOTAL_QURAN_AYAHS / 604;
/** Approximate ayahs per juz (30 juz). */
const AYAHS_PER_JUZ = TOTAL_QURAN_AYAHS / 30;

/**
 * UpdateStudentProgressUseCase
 *
 * Recomputes a student's materialised progress document by aggregating their
 * completed MemorizationRecord and ReviewRecord documents directly from
 * Mongoose (no cross-module repository injection needed).
 *
 * Called fire-and-forget from CreateMemorizationRecord, ApproveMemorizationRecord,
 * and CreateReviewRecord use-cases. Non-fatal if it fails — progress will
 * self-correct on the next successful call.
 *
 * Streak algorithm:
 *   Compare the previously stored lastActivityDate with the newly computed one.
 *   same day  → streak unchanged.
 *   +1 day    → streak incremented (consecutive day of activity).
 *   +2+ days  → streak resets to 1 (gap detected).
 *   no previous activity → streak starts at 1.
 */
@Injectable()
export class UpdateStudentProgressUseCase {
  constructor(
    @Inject(STUDENT_PROGRESS_REPOSITORY)
    private readonly progressRepo: IStudentProgressRepository,
    @InjectModel(MemorizationRecord.name)
    private readonly memModel: Model<MemorizationRecordDocument>,
    @InjectModel(ReviewRecord.name)
    private readonly revModel: Model<ReviewRecordDocument>,
  ) {}

  async execute(tenantId: string, studentId: string): Promise<void> {
    const tenantOid = new Types.ObjectId(tenantId);
    const studentOid = Types.ObjectId.isValid(studentId) ? new Types.ObjectId(studentId) : null;
    if (!studentOid) return;

    // ── Memorization stats ─────────────────────────────────────────────────
    const memDocs = await this.memModel
      .find({ tenantId: tenantOid, student: studentOid, isDeleted: false })
      .select('status range evaluatedAt')
      .lean();

    const completedMem = memDocs.filter((d) => d.status === MemorizationStatus.COMPLETED);

    let totalAyahsMemorized = 0;
    let lastMemorizationDate: Date | null = null;

    for (const doc of completedMem) {
      const range = doc.range as QuranRange;
      if (range) {
        totalAyahsMemorized += estimateAyahsInRange(range);
      }
      const evalDate = doc.evaluatedAt as Date;
      if (!lastMemorizationDate || evalDate > lastMemorizationDate) {
        lastMemorizationDate = evalDate;
      }
    }

    const totalMemorizationSessions = memDocs.length;

    // ── Revision stats ─────────────────────────────────────────────────────
    const revDocs = await this.revModel
      .find({ tenantId: tenantOid, student: studentOid, isDeleted: false })
      .select('range reviewedAt')
      .lean();

    let totalAyahsRevised = 0;
    let lastRevisionDate: Date | null = null;

    for (const doc of revDocs) {
      const range = doc.range as QuranRange;
      if (range) {
        totalAyahsRevised += estimateAyahsInRange(range);
      }
      const revDate = doc.reviewedAt as Date;
      if (!lastRevisionDate || revDate > lastRevisionDate) {
        lastRevisionDate = revDate;
      }
    }

    const totalRevisionSessions = revDocs.length;

    // ── Percentages ────────────────────────────────────────────────────────
    const memorizationPercentage = Math.min(
      100,
      parseFloat(((totalAyahsMemorized / TOTAL_QURAN_AYAHS) * 100).toFixed(2)),
    );
    const revisionPercentage =
      totalAyahsMemorized > 0
        ? Math.min(100, parseFloat(((totalAyahsRevised / totalAyahsMemorized) * 100).toFixed(2)))
        : 0;

    const totalPagesMemorized = Math.floor(totalAyahsMemorized / AYAHS_PER_PAGE);
    const totalJuzMemorized = Math.min(30, Math.floor(totalAyahsMemorized / AYAHS_PER_JUZ));

    // ── Streak calculation ─────────────────────────────────────────────────
    // Determine the most recent activity date across both domains.
    const lastActivityDate: Date | null =
      lastMemorizationDate && lastRevisionDate
        ? lastMemorizationDate > lastRevisionDate
          ? lastMemorizationDate
          : lastRevisionDate
        : lastMemorizationDate ?? lastRevisionDate;

    // Load the previously stored progress to compare against.
    const existing = await this.progressRepo.findByStudent(tenantId, studentId);
    const prevLastActivity = existing?.lastActivityDate ?? null;
    const prevStreak = existing?.currentStreak ?? 0;
    const prevLongest = existing?.longestStreak ?? 0;

    let currentStreak: number;
    let longestStreak: number;

    if (!lastActivityDate) {
      // No activity at all.
      currentStreak = 0;
      longestStreak = prevLongest;
    } else if (!prevLastActivity) {
      // First ever activity recorded.
      currentStreak = 1;
      longestStreak = 1;
    } else {
      // Compare the calendar dates (strip time component).
      const prevDay = toCalendarDay(prevLastActivity);
      const newDay = toCalendarDay(lastActivityDate);
      const diffDays = Math.floor((newDay.getTime() - prevDay.getTime()) / 86_400_000);

      if (diffDays === 0) {
        // Same calendar day as the previous stored activity — streak unchanged.
        currentStreak = prevStreak;
        longestStreak = prevLongest;
      } else if (diffDays === 1) {
        // Activity on the very next day — consecutive day, increment streak.
        currentStreak = prevStreak + 1;
        longestStreak = Math.max(prevLongest, currentStreak);
      } else {
        // Gap of ≥2 days — streak broke. Restart at 1 (there IS activity today/recently).
        currentStreak = 1;
        longestStreak = Math.max(prevLongest, 1);
      }
    }

    await this.progressRepo.upsert({
      tenantId,
      studentId,
      totalAyahsMemorized,
      totalPagesMemorized,
      totalJuzMemorized,
      memorizationPercentage,
      totalMemorizationSessions,
      lastMemorizationDate,
      totalAyahsRevised,
      revisionPercentage,
      totalRevisionSessions,
      lastRevisionDate,
      currentStreak,
      longestStreak,
      lastActivityDate,
    });
  }
}

/**
 * Returns a Date object representing midnight (UTC) for the given date,
 * stripping the time component so calendar-day comparisons are exact.
 */
function toCalendarDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Estimates the number of ayahs in a QuranRange.
 * Accurate for same-surah ranges; approximate for cross-surah (≈10 ayahs/surah).
 * A follow-up task replaces this with an exact Ayah collection count.
 */
function estimateAyahsInRange(range: {
  surahFrom: number;
  ayahFrom: number;
  surahTo: number;
  ayahTo: number;
}): number {
  if (range.surahFrom === range.surahTo) {
    return Math.max(0, range.ayahTo - range.ayahFrom + 1);
  }
  const surahSpan = range.surahTo - range.surahFrom;
  return Math.max(1, surahSpan * 10 + range.ayahTo - range.ayahFrom + 1);
}
