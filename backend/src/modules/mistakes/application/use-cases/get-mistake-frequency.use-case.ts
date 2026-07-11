import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  IQuranMistakeRepository,
  QURAN_MISTAKE_REPOSITORY,
} from '../../domain/repositories/quran-mistake.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * GetMistakeFrequencyUseCase
 *
 * Returns mistake counts grouped by type for a Student profile ID.
 * Ownership enforced per-role.
 */
@Injectable()
export class GetMistakeFrequencyUseCase {
  constructor(
    @Inject(QURAN_MISTAKE_REPOSITORY)
    private readonly mistakeRepo: IQuranMistakeRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, studentId: string, surahNumber?: number) {
    const student = await this.studentRepo.findById(user.tenantId, studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];

    // TENANT_ADMIN / SUPERVISOR: unrestricted.
    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      return this.mistakeRepo.getFrequency(user.tenantId, studentId, surahNumber);
    }

    // STUDENT: own mistakes only — verify via userId resolution.
    if (roles.includes(Role.STUDENT)) {
      const ownProfile = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!ownProfile || ownProfile.id !== studentId) {
        throw new ForbiddenException('Students may only access their own data.');
      }
      return this.mistakeRepo.getFrequency(user.tenantId, studentId, surahNumber);
    }

    // SHEIKH: only for their accessible students.
    if (roles.includes(Role.SHEIKH)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');
      const isAssigned =
        student.sheikhId === sheikh.id ||
        (student.groupId != null && sheikh.groupIds.includes(student.groupId));
      if (!isAssigned) throw new ForbiddenException('Sheikhs may only access their assigned students.');
      return this.mistakeRepo.getFrequency(user.tenantId, studentId, surahNumber);
    }

    // PARENT: linked children only.
    if (roles.includes(Role.PARENT)) {
      const parent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!parent || !parent.studentIds.includes(studentId)) {
        throw new ForbiddenException('Parents may only access linked children.');
      }
      return this.mistakeRepo.getFrequency(user.tenantId, studentId, surahNumber);
    }

    throw new ForbiddenException();
  }
}
