import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { assertCanAccessStudent } from '@shared/authorization/student-scope.util';
import { Role } from '@shared/enums/roles.enum';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { WeaknessHeatmapService } from '../services/weakness-heatmap.service';
import { AyahPerformanceRecord } from '../../domain/repositories/ayah-performance.repository.interface';

/**
 * GetOverdueRevisionsUseCase — Phase 12B.
 *
 * Returns all ayahs where smNextReviewDue <= now, ordered oldest-overdue first.
 * Used by the SM-2 scheduler dashboard and revision planner.
 */
@Injectable()
export class GetOverdueRevisionsUseCase {
  constructor(
    private readonly weaknessService: WeaknessHeatmapService,
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)  private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY)  private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, studentId: string): Promise<AyahPerformanceRecord[]> {
    const student = await this.studentRepo.findById(user.tenantId, studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];
    const sheikh = roles.includes(Role.SHEIKH)
      ? await this.sheikhRepo.findByUserId(user.tenantId, user.sub)
      : null;
    const parent = roles.includes(Role.PARENT)
      ? await this.parentRepo.findByUserId(user.tenantId, user.sub)
      : null;
    const ownProfile = roles.includes(Role.STUDENT)
      ? await this.studentRepo.findByUserId(user.tenantId, user.sub)
      : null;

    assertCanAccessStudent(user, student, {
      sheikh,
      parent,
      ownStudentProfileId: ownProfile?.id ?? null,
    });

    return this.weaknessService.getOverdueRevisions(user.tenantId, studentId);
  }
}
