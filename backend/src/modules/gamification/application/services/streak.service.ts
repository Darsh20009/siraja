import { Inject, Injectable, Logger } from '@nestjs/common';
import { STREAK_REPOSITORY, IStreakRepository } from '../../domain/repositories/streak.repository.interface';

export interface StreakResult {
  currentDailyStreak: number;
  longestDailyStreak: number;
  currentWeeklyStreak: number;
  longestWeeklyStreak: number;
  currentMonthlyStreak: number;
  longestMonthlyStreak: number;
  /** Streak milestones reached on THIS activity (for triggering point awards). */
  milestonesReached: Array<'daily' | 'weekly' | 'monthly'>;
  dailyStreakHit: number; // current streak length if newly extended, else 0
  weeklyStreakHit: number;
  monthlyStreakHit: number;
}

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function isoMonth(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function isoYear(date: Date): string {
  return `${date.getUTCFullYear()}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(
    @Inject(STREAK_REPOSITORY)
    private readonly streakRepo: IStreakRepository,
  ) {}

  async recordActivity(tenantId: string, studentId: string, activityDate: string): Promise<StreakResult> {
    const streak = await this.streakRepo.findByStudent(tenantId, studentId) ??
      await this.streakRepo.upsert(tenantId, studentId);

    const today = new Date(activityDate + 'T00:00:00Z');
    const todayStr = activityDate;
    const thisWeek = isoWeek(today);
    const thisMonth = isoMonth(today);
    const thisYear = isoYear(today);

    const milestonesReached: Array<'daily' | 'weekly' | 'monthly'> = [];
    let dailyStreakHit = 0;
    let weeklyStreakHit = 0;
    let monthlyStreakHit = 0;

    // ── Daily streak logic ────────────────────────────────────────────────
    let currentDailyStreak = streak.currentDailyStreak;
    let longestDailyStreak = streak.longestDailyStreak;

    if (!streak.lastDailyActivityDate) {
      // First activity ever
      currentDailyStreak = 1;
      milestonesReached.push('daily');
      dailyStreakHit = 1;
    } else if (streak.lastDailyActivityDate === todayStr) {
      // Already recorded today — no change
    } else {
      const gap = daysBetween(streak.lastDailyActivityDate, todayStr);
      if (gap === 1) {
        currentDailyStreak += 1;
        milestonesReached.push('daily');
        dailyStreakHit = currentDailyStreak;
      } else {
        currentDailyStreak = 1; // broken streak — reset
        dailyStreakHit = 1;
        milestonesReached.push('daily');
      }
      if (currentDailyStreak > longestDailyStreak) longestDailyStreak = currentDailyStreak;
    }

    // ── Weekly streak logic ───────────────────────────────────────────────
    let currentWeeklyStreak = streak.currentWeeklyStreak;
    let longestWeeklyStreak = streak.longestWeeklyStreak;

    if (!streak.lastWeeklyActivityWeek) {
      currentWeeklyStreak = 1;
      milestonesReached.push('weekly');
      weeklyStreakHit = 1;
    } else if (streak.lastWeeklyActivityWeek === thisWeek) {
      // Already active this week — no change
    } else {
      // Compare week numbers — simplified: if last week was immediately preceding
      const lastWeekDate = new Date(streak.lastDailyActivityDate ?? todayStr);
      const prevWeek = isoWeek(new Date(lastWeekDate.getTime() + 7 * 86400000 - 86400000));
      if (streak.lastWeeklyActivityWeek === prevWeek) {
        currentWeeklyStreak += 1;
      } else {
        currentWeeklyStreak = 1;
      }
      milestonesReached.push('weekly');
      weeklyStreakHit = currentWeeklyStreak;
      if (currentWeeklyStreak > longestWeeklyStreak) longestWeeklyStreak = currentWeeklyStreak;
    }

    // ── Monthly streak logic ──────────────────────────────────────────────
    let currentMonthlyStreak = streak.currentMonthlyStreak;
    let longestMonthlyStreak = streak.longestMonthlyStreak;

    if (!streak.lastMonthlyActivityMonth) {
      currentMonthlyStreak = 1;
      milestonesReached.push('monthly');
      monthlyStreakHit = 1;
    } else if (streak.lastMonthlyActivityMonth === thisMonth) {
      // Already active this month — no change
    } else {
      const [prevYear, prevMon] = streak.lastMonthlyActivityMonth.split('-').map(Number);
      const expectedMonth = prevMon === 12 ? `${prevYear + 1}-01` : `${prevYear}-${String(prevMon + 1).padStart(2, '0')}`;
      if (thisMonth === expectedMonth) {
        currentMonthlyStreak += 1;
      } else {
        currentMonthlyStreak = 1;
      }
      milestonesReached.push('monthly');
      monthlyStreakHit = currentMonthlyStreak;
      if (currentMonthlyStreak > longestMonthlyStreak) longestMonthlyStreak = currentMonthlyStreak;
    }

    // ── Persist ───────────────────────────────────────────────────────────
    // Build updatedActiveDates for perfect-attendance tracking
    const existingDates = streak.activeDatesThisYear ?? [];
    const isNewYear = !existingDates.some(d => d.startsWith(thisYear));
    const activeDatesThisYear = isNewYear
      ? [todayStr]
      : existingDates.includes(todayStr)
      ? existingDates
      : [...existingDates, todayStr];

    Object.assign(streak, {
      currentDailyStreak,
      longestDailyStreak,
      lastDailyActivityDate: todayStr,
      currentWeeklyStreak,
      longestWeeklyStreak,
      lastWeeklyActivityWeek: thisWeek,
      currentMonthlyStreak,
      longestMonthlyStreak,
      lastMonthlyActivityMonth: thisMonth,
      activeDatesThisYear,
    });
    await streak.save();

    this.logger.debug(
      `Streak [${studentId}] daily=${currentDailyStreak} weekly=${currentWeeklyStreak} monthly=${currentMonthlyStreak}`,
    );

    return {
      currentDailyStreak,
      longestDailyStreak,
      currentWeeklyStreak,
      longestWeeklyStreak,
      currentMonthlyStreak,
      longestMonthlyStreak,
      milestonesReached,
      dailyStreakHit,
      weeklyStreakHit,
      monthlyStreakHit,
    };
  }

  async getStreak(tenantId: string, studentId: string) {
    return this.streakRepo.findByStudent(tenantId, studentId);
  }
}
