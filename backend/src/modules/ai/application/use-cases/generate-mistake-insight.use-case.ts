import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { AiFeatureType } from '@shared/enums/ai.enum';
import { assertCanAccessStudent } from '@shared/authorization/student-scope.util';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import {
  IQuranMistakeRepository,
  QURAN_MISTAKE_REPOSITORY,
} from '@modules/mistakes/domain/repositories/quran-mistake.repository.interface';
import { AiInsightOrchestratorService } from '../services/ai-insight-orchestrator.service';
import { AI_SYSTEM_PREAMBLE } from '../prompts/ai-prompt.constants';

/**
 * GenerateMistakeInsightUseCase — "Mistake Intelligence" (deliverable #2).
 * Grounds the narrative purely in `getFrequency()` counts by mistake
 * type/surah, already computed deterministically by MistakesModule.
 */
@Injectable()
export class GenerateMistakeInsightUseCase {
  constructor(
    @Inject(QURAN_MISTAKE_REPOSITORY) private readonly mistakeRepo: IQuranMistakeRepository,
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
    if (roles.includes(Role.PARENT) && !roles.includes(Role.TENANT_ADMIN) && !roles.includes(Role.SHEIKH)) {
      // Parents/students can read, but only Sheikh/Admin/Supervisor can force a regeneration (cost control).
      if (force) throw new ForbiddenException('Only sheikhs, supervisors, or admins may force-regenerate AI insights.');
    }

    const frequency = await this.mistakeRepo.getFrequency(user.tenantId, studentId);
    const totalMistakes = frequency.reduce((sum, item) => sum + item.count, 0);

    if (totalMistakes === 0) {
      return {
        id: null,
        studentId,
        type: AiFeatureType.MISTAKE_INTELLIGENCE,
        content: 'لا توجد أخطاء تلاوة مسجلة لهذا الطالب حتى الآن.',
        generated: false,
      };
    }

    return this.orchestrator.getOrGenerate({
      tenantId: user.tenantId,
      userId: user.sub,
      studentId,
      type: AiFeatureType.MISTAKE_INTELLIGENCE,
      sourceData: frequency,
      structured: { frequency },
      force,
      buildPrompt: () => ({
        system: AI_SYSTEM_PREAMBLE,
        user: `حلّل توزيع أخطاء التلاوة التالية لطالب واحد، وحدّد أكثر أنواع الأخطاء تكرارًا، واقترح تركيزًا تدريبيًا محددًا لمعالجتها:\n\n${JSON.stringify(frequency)}`,
      }),
    });
  }
}
