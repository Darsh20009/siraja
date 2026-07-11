import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { AiFeatureType } from '@shared/enums/ai.enum';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import {
  IQuranMistakeRepository,
  QURAN_MISTAKE_REPOSITORY,
} from '@modules/mistakes/domain/repositories/quran-mistake.repository.interface';
import {
  IReviewRecordRepository,
  REVIEW_RECORD_REPOSITORY,
} from '@modules/reviews/domain/repositories/review-record.repository.interface';
import {
  IStudentProgressRepository,
  STUDENT_PROGRESS_REPOSITORY,
} from '@modules/progress/domain/repositories/student-progress.repository.interface';
import { AiInsightOrchestratorService } from '../services/ai-insight-orchestrator.service';
import { AI_SYSTEM_PREAMBLE } from '../prompts/ai-prompt.constants';

/**
 * GenerateSheikhAiReportUseCase — "Sheikh AI Reports" (deliverable #8).
 * Aggregates mistake/revision/progress data across every student assigned
 * to a sheikh (directly or via their circles) into one Arabic narrative
 * highlighting which students most need attention this week. This is an
 * additive AI-narrative layer, not a replacement for the deterministic
 * `/reports/sheikhs/:id` endpoint (Phase 8 ReportingModule) — RBAC mirrors
 * `GetSheikhReportUseCase` exactly.
 */
@Injectable()
export class GenerateSheikhAiReportUseCase {
  constructor(
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(QURAN_MISTAKE_REPOSITORY) private readonly mistakeRepo: IQuranMistakeRepository,
    @Inject(REVIEW_RECORD_REPOSITORY) private readonly reviewRepo: IReviewRecordRepository,
    @Inject(STUDENT_PROGRESS_REPOSITORY) private readonly progressRepo: IStudentProgressRepository,
    private readonly orchestrator: AiInsightOrchestratorService,
  ) {}

  async execute(user: AccessTokenPayload, sheikhId: string, force = false) {
    const sheikh = await this.sheikhRepo.findById(user.tenantId, sheikhId);
    if (!sheikh) throw new NotFoundException('Sheikh not found.');

    const roles = user.roles as Role[];
    if (roles.includes(Role.SHEIKH) && !roles.includes(Role.SUPERVISOR) && !roles.includes(Role.TENANT_ADMIN)) {
      if (sheikh.userId !== user.sub) {
        throw new ForbiddenException('Sheikhs may only view their own AI report.');
      }
    }
    if (force && !roles.some((r) => [Role.SHEIKH, Role.SUPERVISOR, Role.TENANT_ADMIN].includes(r))) {
      throw new ForbiddenException('Only sheikhs, supervisors, or admins may force-regenerate AI reports.');
    }

    const students = await this.studentRepo.findBySheikh(user.tenantId, sheikh.id, sheikh.groupIds);
    const perStudent = await Promise.all(
      students.map(async (s) => {
        const [mistakes, revision, progress] = await Promise.all([
          this.mistakeRepo.getFrequency(user.tenantId, s.id),
          this.reviewRepo.getStudentPerformance(user.tenantId, s.id),
          this.progressRepo.findByStudent(user.tenantId, s.id),
        ]);
        return {
          studentId: s.id,
          totalMistakes: mistakes.reduce((sum, m) => sum + m.count, 0),
          dueTodayCount: revision.dueTodayCount,
          memorizationPercentage: progress?.memorizationPercentage ?? 0,
          currentStreak: progress?.currentStreak ?? 0,
        };
      }),
    );

    const sourceData = { sheikhId: sheikh.id, studentCount: students.length, students: perStudent };

    return this.orchestrator.getOrGenerate({
      tenantId: user.tenantId,
      userId: user.sub,
      studentId: null,
      type: AiFeatureType.SHEIKH_REPORT,
      sourceData,
      structured: sourceData,
      force,
      buildPrompt: () => ({
        system: AI_SYSTEM_PREAMBLE,
        user: `فيما يلي ملخص بيانات طلاب حلقة الشيخ. حدّد أولويات هذا الأسبوع: من يحتاج تدخلًا عاجلًا (أخطاء متكررة، مراجعات متراكمة، تراجع في الانتظام)، ومن يستحق تشجيعًا لأدائه المتميز:\n\n${JSON.stringify(sourceData)}`,
      }),
    });
  }
}
