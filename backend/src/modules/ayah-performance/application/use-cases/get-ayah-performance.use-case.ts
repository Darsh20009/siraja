import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  AYAH_PERFORMANCE_REPOSITORY,
  IAyahPerformanceRepository,
} from '../../domain/repositories/ayah-performance.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';
import { assertCanAccessStudent } from '@shared/authorization/student-scope.util';
import { AyahPerformanceStatus } from '@shared/enums/smart-mushaf.enum';

@Injectable()
export class GetAyahPerformanceUseCase {
  constructor(
    @Inject(AYAH_PERFORMANCE_REPOSITORY)
    private readonly performanceRepo: IAyahPerformanceRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, studentId: string, surahNumber: number, ayahNumber: number) {
    const student = await this.studentRepo.findById(user.tenantId, studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];
    await assertCanAccessStudent(user, student, {
      sheikh: roles.includes(Role.SHEIKH) ? await this.sheikhRepo.findByUserId(user.tenantId, user.sub) : undefined,
      parent: roles.includes(Role.PARENT) ? await this.parentRepo.findByUserId(user.tenantId, user.sub) : undefined,
      ownStudentProfileId: roles.includes(Role.STUDENT)
        ? (await this.studentRepo.findByUserId(user.tenantId, user.sub))?.id ?? null
        : undefined,
    });

    const record = await this.performanceRepo.findOne(user.tenantId, studentId, surahNumber, ayahNumber);
    return (
      record ?? {
        studentId,
        surahNumber,
        ayahNumber,
        status: AyahPerformanceStatus.NOT_STARTED,
        confidenceScore: 0,
        heatmapLevel: null,
        mistakeCount: 0,
        revisionCount: 0,
        lastMemorizedAt: null,
        lastRevisedAt: null,
        lastMistakeAt: null,
      }
    );
  }
}
