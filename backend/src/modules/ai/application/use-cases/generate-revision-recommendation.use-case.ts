import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { AiFeatureType } from '@shared/enums/ai.enum';
import { HeatmapLevel } from '@shared/enums/smart-mushaf.enum';
import { assertCanAccessStudent } from '@shared/authorization/student-scope.util';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import {
  IReviewRecordRepository,
  REVIEW_RECORD_REPOSITORY,
} from '@modules/reviews/domain/repositories/review-record.repository.interface';
import {
  AYAH_PERFORMANCE_REPOSITORY,
  IAyahPerformanceRepository,
} from '@modules/ayah-performance/domain/repositories/ayah-performance.repository.interface';
import { AiInsightOrchestratorService } from '../services/ai-insight-orchestrator.service';
import { AI_SYSTEM_PREAMBLE } from '../prompts/ai-prompt.constants';

/** GenerateRevisionRecommendationUseCase — "Revision Recommendations" (deliverable #4). */
@Injectable()
export class GenerateRevisionRecommendationUseCase {
  constructor(
    @Inject(REVIEW_RECORD_REPOSITORY) private readonly reviewRepo: IReviewRecordRepository,
    @Inject(AYAH_PERFORMANCE_REPOSITORY) private readonly performanceRepo: IAyahPerformanceRepository,
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository,
    private readonly orchestrator: AiInsightOrchestratorService,
  ) {}

  async execute(user: AccessTokenPayload, studentId: string, force = false) {
    const student = await this.studentRepo.findById(user.tenantId, studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];
    assertCanAccessStudent(user, student, {
      sheikh: roles.includes(Role.SHEIKH) ? await this.sheikhRepo.findByUserId(user.tenantId, user.sub) : undefined,
      parent: roles.includes(Role.PARENT) ? await this.parentRepo.findByUserId(user.tenantId, user.sub) : undefined,
      ownStudentProfileId: roles.includes(Role.STUDENT)
        ? (await this.studentRepo.findByUserId(user.tenantId, user.sub))?.id ?? null
        : undefined,
    });
    if (force && !roles.some((r) => [Role.SHEIKH, Role.SUPERVISOR, Role.TENANT_ADMIN].includes(r))) {
      throw new ForbiddenException('Only sheikhs, supervisors, or admins may force-regenerate AI insights.');
    }

    const [performance, weakAyahs] = await Promise.all([
      this.reviewRepo.getStudentPerformance(user.tenantId, studentId),
      this.performanceRepo.findByStudent(user.tenantId, studentId, { heatmapLevel: HeatmapLevel.WEAK }),
    ]);

    if (performance.dueTodayCount === 0 && weakAyahs.length === 0) {
      return {
        id: null,
        studentId,
        type: AiFeatureType.REVISION_RECOMMENDATION,
        content: 'لا توجد مراجعات مستحقة أو آيات ضعيفة تحتاج تركيزًا خاصًا حاليًا.',
        generated: false,
      };
    }

    const weakSummary = weakAyahs
      .slice(0, 15)
      .map((a) => ({ surahNumber: a.surahNumber, ayahNumber: a.ayahNumber, confidenceScore: a.confidenceScore }));

    const sourceData = { performance, weakAyahs: weakSummary };

    return this.orchestrator.getOrGenerate({
      tenantId: user.tenantId,
      userId: user.sub,
      studentId,
      type: AiFeatureType.REVISION_RECOMMENDATION,
      sourceData,
      structured: sourceData,
      force,
      buildPrompt: () => ({
        system: AI_SYSTEM_PREAMBLE,
        user: `بالاعتماد فقط على إحصائيات المراجعة والآيات الضعيفة التالية لطالب واحد، اقترح خطة مراجعة أسبوعية مركّزة (ما يُراجَع أولًا، وبأي وتيرة):\n\n${JSON.stringify(sourceData)}`,
      }),
    });
  }
}
