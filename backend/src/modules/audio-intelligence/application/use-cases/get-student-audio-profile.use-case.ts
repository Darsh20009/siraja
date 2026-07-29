import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';

import {
  IAudioSessionRepository,
  AUDIO_SESSION_REPOSITORY,
} from '../../domain/repositories/audio-session.repository.interface';
import { AudioScoreEngine } from '../../domain/engines/audio-score.engine';
import type { AudioSession } from '../../domain/entities/audio-session.entity';
import type { AudioScore } from '../../domain/entities/audio-score.entity';
import type { AudioRecommendation } from '../../domain/entities/audio-recommendation.entity';

export interface StudentAudioProfile {
  studentId: string;
  tenantId: string;
  generatedAt: Date;

  totalSessions: number;
  completedSessions: number;

  /** Mean composite score across completed sessions. 0 if no completed sessions. */
  averageCompositeScore: number;
  /** Best composite score in the window. */
  bestCompositeScore: number;
  /** Most recent composite score. */
  latestCompositeScore: number;

  /** Mean accuracy score across completed sessions. */
  averageAccuracyScore: number;
  /** Mean tajweed score across completed sessions. */
  averageTajweedScore: number;
  /** Mean fluency score across completed sessions. */
  averageFluencyScore: number;
  /** Mean consistency score. */
  averageConsistencyScore: number;

  /** Total mistakes across all completed sessions. */
  totalMistakes: number;
  totalCriticalMistakes: number;

  /** Performance tier of the most recent session. */
  latestTier: AudioScore['tier'] | null;

  /** Top recommendations from the most recent session. */
  latestRecommendations: AudioRecommendation[];

  /** Most recent sessions (summary, no sub-documents). */
  recentSessions: AudioSession[];
}

/**
 * GetStudentAudioProfileUseCase — Phase 13B.
 *
 * Aggregates audio intelligence data across the student's recent sessions
 * into a StudentAudioProfile suitable for sheikh/parent/admin dashboards.
 *
 * RBAC:
 *   STUDENT         → own profile only
 *   PARENT          → use GetAudioParentInsightsUseCase instead
 *   SHEIKH / SUPERVISOR / TENANT_ADMIN → any student in tenant
 */
@Injectable()
export class GetStudentAudioProfileUseCase {
  private readonly scoreEngine = new AudioScoreEngine();

  constructor(
    @Inject(AUDIO_SESSION_REPOSITORY)
    private readonly sessionRepo: IAudioSessionRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
  ) {}

  async execute(user: AccessTokenPayload, studentId: string): Promise<StudentAudioProfile> {
    const roles = user.roles as Role[];

    // ── Load student ──────────────────────────────────────────────────────
    const student = await this.studentRepo.findById(user.tenantId, studentId);
    if (!student) throw new NotFoundException('Student not found.');

    // ── RBAC ownership ─────────────────────────────────────────────────────
    if (roles.includes(Role.STUDENT)) {
      const self = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!self || self.id !== studentId) {
        throw new ForbiddenException('Students can only view their own audio profile.');
      }
    }

    // ── Load recent sessions (summary level) ───────────────────────────────
    const sessions = await this.sessionRepo.findRecentByStudent(user.tenantId, studentId, 90);
    const completed = sessions.filter(
      (s) => s.status === 'completed' || s.status === 'no_asr',
    );

    if (completed.length === 0) {
      return this.emptyProfile(studentId, user.tenantId, sessions);
    }

    const scores = completed
      .map((s) => s.score)
      .filter((s): s is AudioScore => s !== undefined);

    const averageOf = (fn: (s: AudioScore) => number): number =>
      scores.length === 0
        ? 0
        : Math.round(scores.reduce((sum, s) => sum + fn(s), 0) / scores.length);

    const latest = completed[0]; // most recent first
    const latestScore = latest.score;

    return {
      studentId,
      tenantId: user.tenantId,
      generatedAt: new Date(),
      totalSessions: sessions.length,
      completedSessions: completed.length,
      averageCompositeScore: averageOf((s) => s.compositeScore),
      bestCompositeScore: Math.max(...scores.map((s) => s.compositeScore), 0),
      latestCompositeScore: latestScore?.compositeScore ?? 0,
      averageAccuracyScore: averageOf((s) => s.breakdown.accuracyScore),
      averageTajweedScore: averageOf((s) => s.breakdown.tajweedScore),
      averageFluencyScore: averageOf((s) => s.breakdown.fluencyScore),
      averageConsistencyScore: averageOf((s) => s.breakdown.consistencyScore),
      totalMistakes: completed.reduce((sum, s) => sum + s.totalMistakes, 0),
      totalCriticalMistakes: completed.reduce((sum, s) => sum + s.criticalMistakes, 0),
      latestTier: latestScore ? this.scoreEngine.tier(latestScore.compositeScore) : null,
      latestRecommendations: latest.recommendations ?? [],
      recentSessions: sessions.slice(0, 10),
    };
  }

  private emptyProfile(
    studentId: string,
    tenantId: string,
    sessions: AudioSession[],
  ): StudentAudioProfile {
    return {
      studentId,
      tenantId,
      generatedAt: new Date(),
      totalSessions: sessions.length,
      completedSessions: 0,
      averageCompositeScore: 0,
      bestCompositeScore: 0,
      latestCompositeScore: 0,
      averageAccuracyScore: 0,
      averageTajweedScore: 0,
      averageFluencyScore: 0,
      averageConsistencyScore: 0,
      totalMistakes: 0,
      totalCriticalMistakes: 0,
      latestTier: null,
      latestRecommendations: [],
      recentSessions: sessions.slice(0, 10),
    };
  }
}
