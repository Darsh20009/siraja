import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';

import {
  IAudioSessionRepository,
  AUDIO_SESSION_REPOSITORY,
} from '../../domain/repositories/audio-session.repository.interface';
import type { AudioScore } from '../../domain/entities/audio-score.entity';
import type { AudioRecommendation } from '../../domain/entities/audio-recommendation.entity';

export interface AudioChildSummary {
  studentId: string;
  totalSessions: number;
  completedSessions: number;
  averageCompositeScore: number;
  latestCompositeScore: number;
  latestTier: AudioScore['tier'] | null;
  totalMistakes: number;
  criticalMistakes: number;
  averageTajweedScore: number;
  topRecommendations: AudioRecommendation[];
  lastSessionDate: string | null;
}

export interface AudioParentInsight {
  parentId: string;
  tenantId: string;
  generatedAt: Date;
  children: AudioChildSummary[];
  aggregate: {
    totalSessionsAllChildren: number;
    averageCompositeScoreAllChildren: number;
    childrenWithCriticalMistakes: number;
  };
}

/**
 * GetAudioParentInsightsUseCase — Phase 13B.
 *
 * Provides a parent with an audio intelligence summary for all of their
 * linked children.
 *
 * RBAC:
 *   PARENT          → own children only
 *   SUPERVISOR / TENANT_ADMIN → any parent
 */
@Injectable()
export class GetAudioParentInsightsUseCase {
  constructor(
    @Inject(AUDIO_SESSION_REPOSITORY)
    private readonly sessionRepo: IAudioSessionRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
  ) {}

  async execute(user: AccessTokenPayload, parentId: string): Promise<AudioParentInsight> {
    const roles = user.roles as Role[];

    // ── Load parent ────────────────────────────────────────────────────────
    const parent = await this.parentRepo.findById(user.tenantId, parentId);
    if (!parent) throw new NotFoundException('Parent not found.');

    // ── RBAC ───────────────────────────────────────────────────────────────
    if (roles.includes(Role.PARENT)) {
      const selfParent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!selfParent || selfParent.id !== parentId) {
        throw new ForbiddenException('Parents can only view insights for their own children.');
      }
    }

    // ── Load linked student IDs ────────────────────────────────────────────
    const students = await this.studentRepo.findByParent(user.tenantId, parentId);

    // ── Build per-child summaries ─────────────────────────────────────────
    const children: AudioChildSummary[] = [];
    for (const student of students) {
      const summary = await this.buildChildSummary(user.tenantId, student.id);
      children.push(summary);
    }

    // ── Aggregate ─────────────────────────────────────────────────────────
    const totalSessions = children.reduce((s, c) => s + c.totalSessions, 0);
    const completedChildren = children.filter((c) => c.completedSessions > 0);
    const avgComposite =
      completedChildren.length === 0
        ? 0
        : Math.round(
            completedChildren.reduce((s, c) => s + c.averageCompositeScore, 0) /
              completedChildren.length,
          );
    const childrenWithCriticals = children.filter((c) => c.criticalMistakes > 0).length;

    return {
      parentId,
      tenantId: user.tenantId,
      generatedAt: new Date(),
      children,
      aggregate: {
        totalSessionsAllChildren: totalSessions,
        averageCompositeScoreAllChildren: avgComposite,
        childrenWithCriticalMistakes: childrenWithCriticals,
      },
    };
  }

  private async buildChildSummary(tenantId: string, studentId: string): Promise<AudioChildSummary> {
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

    const latest = completed[0];
    const latestScore = latest?.score;

    return {
      studentId,
      totalSessions: sessions.length,
      completedSessions: completed.length,
      averageCompositeScore: avgComposite,
      latestCompositeScore: latestScore?.compositeScore ?? 0,
      latestTier: latestScore
        ? (latestScore.tier as AudioScore['tier'])
        : null,
      totalMistakes: completed.reduce((s, sess) => s + sess.totalMistakes, 0),
      criticalMistakes: completed.reduce((s, sess) => s + sess.criticalMistakes, 0),
      averageTajweedScore: avgTajweed,
      topRecommendations: (latest?.recommendations ?? []).slice(0, 3),
      lastSessionDate: latest ? latest.createdAt.toISOString() : null,
    };
  }
}
