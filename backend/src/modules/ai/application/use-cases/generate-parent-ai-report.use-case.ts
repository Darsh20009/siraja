import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { AiFeatureType } from '@shared/enums/ai.enum';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
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
 * GenerateParentAiReportUseCase — "Parent AI Reports" (deliverable #7).
 * Aggregates each linked child's mistakes/revision/progress into one warm,
 * plain-language Arabic narrative for the parent. RBAC mirrors
 * `GetParentReportUseCase` exactly. Additive to (not a replacement for) the
 * deterministic `/reports/parents/:id` endpoint.
 */
@Injectable()
export class GenerateParentAiReportUseCase {
  constructor(
    @Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository,
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(QURAN_MISTAKE_REPOSITORY) private readonly mistakeRepo: IQuranMistakeRepository,
    @Inject(REVIEW_RECORD_REPOSITORY) private readonly reviewRepo: IReviewRecordRepository,
    @Inject(STUDENT_PROGRESS_REPOSITORY) private readonly progressRepo: IStudentProgressRepository,
    private readonly orchestrator: AiInsightOrchestratorService,
  ) {}

  async execute(user: AccessTokenPayload, parentId: string, force = false) {
    const parent = await this.parentRepo.findById(user.tenantId, parentId);
    if (!parent) throw new NotFoundException('Parent not found.');

    const roles = user.roles as Role[];
    if (roles.includes(Role.PARENT) && !roles.includes(Role.TENANT_ADMIN)) {
      if (parent.userId !== user.sub) {
        throw new ForbiddenException('Parents may only view their own AI report.');
      }
    }
    if (force && !roles.some((r) => [Role.SHEIKH, Role.SUPERVISOR, Role.TENANT_ADMIN].includes(r))) {
      throw new ForbiddenException('Only sheikhs, supervisors, or admins may force-regenerate AI reports.');
    }

    const children = (
      await Promise.all(
        parent.studentIds.map(async (studentId) => {
          const student = await this.studentRepo.findById(user.tenantId, studentId);
          if (!student) return null;
          const [mistakes, revision, progress] = await Promise.all([
            this.mistakeRepo.getFrequency(user.tenantId, studentId),
            this.reviewRepo.getStudentPerformance(user.tenantId, studentId),
            this.progressRepo.findByStudent(user.tenantId, studentId),
          ]);
          return {
            studentId,
            totalMistakes: mistakes.reduce((sum, m) => sum + m.count, 0),
            dueTodayCount: revision.dueTodayCount,
            memorizationPercentage: progress?.memorizationPercentage ?? 0,
            currentStreak: progress?.currentStreak ?? 0,
          };
        }),
      )
    ).filter(Boolean);

    const sourceData = { parentId: parent.id, children };

    return this.orchestrator.getOrGenerate({
      tenantId: user.tenantId,
      userId: user.sub,
      studentId: null,
      type: AiFeatureType.PARENT_REPORT,
      sourceData,
      structured: sourceData,
      force,
      buildPrompt: () => ({
        system: AI_SYSTEM_PREAMBLE,
        user: `فيما يلي ملخص بيانات أطفال ولي الأمر. اكتب تقريرًا أسريًا ودودًا يبرز التقدّم الإيجابي أولًا، ثم يشير بلطف إلى ما يحتاج اهتمامًا أكبر في المنزل (مراجعة، تكرار أخطاء):\n\n${JSON.stringify(sourceData)}`,
      }),
    });
  }
}
