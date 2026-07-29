import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';

import {
  IAudioSessionRepository,
  AUDIO_SESSION_REPOSITORY,
} from '../../domain/repositories/audio-session.repository.interface';
import type { AudioScore } from '../../domain/entities/audio-score.entity';
import type { AudioRecommendation } from '../../domain/entities/audio-recommendation.entity';

export interface AudioStudentBrief {
  studentId: string;
  totalSessions: number;
  completedSessions: number;
  averageCompositeScore: number;
  latestCompositeScore: number;
  latestTier: AudioScore['tier'] | null;
  totalMistakes: number;
  criticalMistakes: number;
  averageTajweedScore: number;
  averageAccuracyScore: number;
  topRecommendations: AudioRecommendation[];
  lastSessionDate: string | null;
  needsAttention: boolean;
}

export interface AudioSheikhInsight {
  sheikhId: string;
  tenantId: string;
  generatedAt: Date;
  totalStudents: number;
  students: AudioStudentBrief[];

  /** Students with critical mistakes or very low scores — needs immediate attention. */
  needsAttention: string[];
  /** Students with the highest average composite scores. */
  topPerformers: string[];

  classAggregate: {
    averageCompositeScore: number;
    averageTajweedScore: number;
    averageAccuracyScore: number;
    totalMistakes: number;
    totalCriticalMistakes: number;
    studentsWithRecentSessions: number;
  };
}

/**
 * GetAudioSheikhInsightsUseCase — Phase 13B.
 *
 * Provides a sheikh with an audio intelligence summary across all students
 * assigned to their circles.
 *
 * RBAC:
 *   SHEIKH          → own students only
 *   SUPERVISOR / TENANT_ADMIN → any sheikh
 */
@Injectable()
export class GetAudioSheikhInsightsUseCase {
  /** Composite score below which a student is flagged needsAttention. */
  private static readonly ATTENTION_SCORE_THRESHOLD = 50;

  constructor(
    @Inject(AUDIO_SESSION_REPOSITORY)
    private readonly sessionRepo: IAudioSessionRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
  ) {}

  async execute(user: AccessTokenPayload, sheikhId: string): Promise<AudioSheikhInsight> {
    const roles = user.roles as Role[];

    // ── Load sheikh ────────────────────────────────────────────────────────
    const sheikh = await this.sheikhRepo.findById(user.tenantId, sheikhId);
    if (!sheikh) throw new NotFoundException('Sheikh not found.');

    // ── RBAC ───────────────────────────────────────────────────────────────
    if (roles.includes(Role.SHEIKH)) {
      const selfSheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!selfSheikh || selfSheikh.id !== sheikhId) {
        throw new ForbiddenException('Sheikhs can only view insights for their own students.');
      }
    }

    // ── Load students assigned to this sheikh ──────────────────────────────
    const students = await this.studentRepo.findBySheikh(user.tenantId, sheikhId);

    // ── Build per-student briefs ───────────────────────────────────────────
    const briefs: AudioStudentBrief[] = [];
    for (const student of students) {
      const brief = await this.buildStudentBrief(user.tenantId, student.id);
      briefs.push(brief);
    }

    // ── Derive attention list and top performers ───────────────────────────
    const needsAttention = briefs
      .filter((b) => b.needsAttention)
      .map((b) => b.studentId);

    const topPerformers = [...briefs]
      .filter((b) => b.completedSessions > 0)
      .sort((a, b) => b.averageCompositeScore - a.averageCompositeScore)
      .slice(0, 3)
      .map((b) => b.studentId);

    // ── Class aggregate ────────────────────────────────────────────────────
    const withSessions = briefs.filter((b) => b.completedSessions > 0);
    const avgOf = (fn: (b: AudioStudentBrief) => number): number =>
      withSessions.length === 0
        ? 0
        : Math.round(withSessions.reduce((s, b) => s + fn(b), 0) / withSessions.length);

    return {
      sheikhId,
      tenantId: user.tenantId,
      generatedAt: new Date(),
      totalStudents: students.length,
      students: briefs,
      needsAttention,
      topPerformers,
      classAggregate: {
        averageCompositeScore: avgOf((b) => b.averageCompositeScore),
        averageTajweedScore: avgOf((b) => b.averageTajweedScore),
        averageAccuracyScore: avgOf((b) => b.averageAccuracyScore),
        totalMistakes: briefs.reduce((s, b) => s + b.totalMistakes, 0),
        totalCriticalMistakes: briefs.reduce((s, b) => s + b.criticalMistakes, 0),
        studentsWithRecentSessions: withSessions.length,
      },
    };
  }

  private async buildStudentBrief(tenantId: string, studentId: string): Promise<AudioStudentBrief> {
    const sessions = await this.sessionRepo.findRecentByStudent(tenantId, studentId, 90);
    const completed = sessions.filter(
      (s) => s.status === 'completed' || s.status === 'no_asr',
    );

    const scores = completed
      .map((s) => s.score)
      .filter((s): s is AudioScore => s !== undefined);

    const avgComposite =
      scores.length === 0
        ? 0
        : Math.round(scores.reduce((s, sc) => s + sc.compositeScore, 0) / scores.length);

    const avgTajweed =
      scores.length === 0
        ? 0
        : Math.round(scores.reduce((s, sc) => s + sc.breakdown.tajweedScore, 0) / scores.length);

    const avgAccuracy =
      scores.length === 0
        ? 0
        : Math.round(scores.reduce((s, sc) => s + sc.breakdown.accuracyScore, 0) / scores.length);

    const latest = completed[0];
    const latestScore = latest?.score;
    const criticalMistakes = completed.reduce((s, sess) => s + sess.criticalMistakes, 0);

    const needsAttention =
      (latestScore !== undefined && latestScore.compositeScore < GetAudioSheikhInsightsUseCase.ATTENTION_SCORE_THRESHOLD) ||
      criticalMistakes > 0;

    return {
      studentId,
      totalSessions: sessions.length,
      completedSessions: completed.length,
      averageCompositeScore: avgComposite,
      latestCompositeScore: latestScore?.compositeScore ?? 0,
      latestTier: latestScore?.tier ?? null,
      totalMistakes: completed.reduce((s, sess) => s + sess.totalMistakes, 0),
      criticalMistakes,
      averageTajweedScore: avgTajweed,
      averageAccuracyScore: avgAccuracy,
      topRecommendations: (latest?.recommendations ?? []).slice(0, 3),
      lastSessionDate: latest ? latest.createdAt.toISOString() : null,
      needsAttention,
    };
  }
}
