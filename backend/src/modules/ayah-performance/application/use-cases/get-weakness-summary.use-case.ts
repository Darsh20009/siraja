import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { assertCanAccessStudent } from '@shared/authorization/student-scope.util';
import { Role } from '@shared/enums/roles.enum';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { WeaknessHeatmapService, SurahWeakness, WeakAyah } from '../services/weakness-heatmap.service';

export interface WeaknessSummaryResponse {
  studentId: string;
  surahSummary: SurahWeakness[];
  weakestAyahs: WeakAyah[];
}

/**
 * GetWeaknessSummaryUseCase — Phase 12B.
 *
 * Returns per-surah weakness rollup + top-N weakest ayahs for a student.
 * Enforces the standard 4-branch ownership pattern.
 */
@Injectable()
export class GetWeaknessSummaryUseCase {
  constructor(
    private readonly weaknessService: WeaknessHeatmapService,
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)  private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY)  private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, studentId: string): Promise<WeaknessSummaryResponse> {
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

    const [surahSummary, weakestAyahs] = await Promise.all([
      this.weaknessService.getSurahWeaknessSummary(user.tenantId, studentId),
      this.weaknessService.getWeakestAyahs(user.tenantId, studentId, 20),
    ]);

    return { studentId, surahSummary, weakestAyahs };
  }
}
