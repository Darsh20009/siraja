import { Injectable } from '@nestjs/common';
import { NativeAiEngineService } from '../../../native-ai/application/services/native-ai-engine.service';
import type { MemorizationPattern } from '../../../native-ai/domain/entities/memorization-pattern.entity';

export interface SmSession {
  grade: number;
  easeFactor?: number;
  interval?: number;
  repetitions?: number;
}

export interface RevisionItem {
  /** Identifies the ayah or section to revise. */
  id: string;
  label: string;
  /** ISO date string of the recommended revision date. */
  nextRevisionDate: string;
  /** Estimated retention probability on the recommended date. */
  retentionOnDate: number;
  /** SM-2 interval in days. */
  intervalDays: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface RevisionSchedule {
  studentId: string;
  tenantId: string;
  items: RevisionItem[];
  pattern: MemorizationPattern;
  totalDueThisWeek: number;
  totalDueNextWeek: number;
  generatedAt: Date;
}

/**
 * RevisionSchedulerService — builds a prioritised SM-2 revision schedule.
 *
 * Chains: MemorizationPatternEngine → per-item scheduling.
 * Deterministic, in-process, zero external AI.
 */
@Injectable()
export class RevisionSchedulerService {
  constructor(private readonly engines: NativeAiEngineService) {}

  /**
   * Build a revision schedule for a student.
   *
   * @param studentId       - Student being scheduled.
   * @param tenantId        - Owning tenant.
   * @param sessions        - Historical SM-2 session data.
   * @param itemsToSchedule - List of items (ayahs/sections) that need scheduling.
   */
  buildSchedule(
    studentId: string,
    tenantId: string,
    sessions: SmSession[],
    itemsToSchedule: Array<{ id: string; label: string; lastGrade?: number }>,
  ): RevisionSchedule {
    const pattern = this.engines.memorizationPattern.analyze(sessions);
    const now = new Date();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    const items: RevisionItem[] = itemsToSchedule.map((item) => {
      // Compute SM-2 for this item using its last grade (default 3 = bare pass)
      const grade = item.lastGrade ?? 3;
      const sm2 = this.engines.memorizationPattern.computeSm2(
        pattern.easeFactor,
        pattern.interval,
        pattern.repetitions,
        grade,
      );

      const nextRevision = new Date(now.getTime() + sm2.interval * 24 * 60 * 60 * 1000);
      const retentionOnDate = this.engines.memorizationPattern.computeRetention(
        sm2.interval,
        pattern.easeFactor,
      );

      const daysUntil = sm2.interval;
      let priority: RevisionItem['priority'];
      if (daysUntil <= 1) priority = 'critical';
      else if (daysUntil <= 3) priority = 'high';
      else if (daysUntil <= 7) priority = 'medium';
      else priority = 'low';

      return {
        id: item.id,
        label: item.label,
        nextRevisionDate: nextRevision.toISOString(),
        retentionOnDate,
        intervalDays: sm2.interval,
        priority,
      };
    });

    // Sort by urgency: smallest interval first
    items.sort((a, b) => a.intervalDays - b.intervalDays);

    const nowMs = now.getTime();
    const totalDueThisWeek = items.filter(
      (i) => new Date(i.nextRevisionDate).getTime() - nowMs <= oneWeekMs,
    ).length;
    const totalDueNextWeek = items.filter((i) => {
      const diff = new Date(i.nextRevisionDate).getTime() - nowMs;
      return diff > oneWeekMs && diff <= 2 * oneWeekMs;
    }).length;

    return {
      studentId,
      tenantId,
      items,
      pattern,
      totalDueThisWeek,
      totalDueNextWeek,
      generatedAt: now,
    };
  }

  /**
   * Compute the optimal next revision date from a memorization pattern.
   * Convenience helper for callers that already have the pattern.
   */
  getNextRevisionDate(pattern: MemorizationPattern): Date {
    return new Date(Date.now() + pattern.interval * 24 * 60 * 60 * 1000);
  }
}
