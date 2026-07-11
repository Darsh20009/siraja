import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { assertCanAccessStudent } from '@shared/authorization/student-scope.util';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { AI_INSIGHT_REPOSITORY, IAiInsightRepository } from '../../domain/repositories/ai-insight.repository.interface';

/**
 * ListAiInsightsUseCase — "AI Insights" (deliverable #1). A thin
 * aggregator over every `AiReport` already generated for a student across
 * all Phase 11 features — no separate pipeline of its own, since every
 * other use-case already persists its output here.
 */
@Injectable()
export class ListAiInsightsUseCase {
  constructor(
    @Inject(AI_INSIGHT_REPOSITORY) private readonly insightRepo: IAiInsightRepository,
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, studentId: string, page = 1, limit = 20) {
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

    return this.insightRepo.listForStudent(user.tenantId, studentId, page, limit);
  }
}
