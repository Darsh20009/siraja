import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  IQuranMistakeRepository,
  QURAN_MISTAKE_REPOSITORY,
} from '../../domain/repositories/quran-mistake.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * ResolveMistakeUseCase
 *
 * Marks a mistake as corrected/resolved. Restricted to roles that can
 * manage learning records for the mistake's student:
 *   - TENANT_ADMIN / SUPERVISOR: unrestricted within tenant.
 *   - SHEIKH: only for students assigned to them or enrolled in their circles.
 *   - STUDENT / PARENT: denied — resolution is a teaching action.
 *
 * RBAC permission: MEMORIZATION.UPDATE.
 */
@Injectable()
export class ResolveMistakeUseCase {
  constructor(
    @Inject(QURAN_MISTAKE_REPOSITORY)
    private readonly mistakeRepo: IQuranMistakeRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, id: string) {
    const mistake = await this.mistakeRepo.findById(user.tenantId, id);
    if (!mistake) throw new NotFoundException('Mistake not found.');

    const roles = user.roles as Role[];

    // TENANT_ADMIN / SUPERVISOR: unrestricted.
    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      return this.mistakeRepo.resolve(user.tenantId, id, user.sub);
    }

    // SHEIKH: only for students assigned to them or in their circles.
    if (roles.includes(Role.SHEIKH)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');

      const student = await this.studentRepo.findById(user.tenantId, mistake.studentId);
      if (!student) throw new NotFoundException('Student not found.');

      const isAssigned =
        student.sheikhId === sheikh.id ||
        (student.groupId != null && sheikh.groupIds.includes(student.groupId));

      if (!isAssigned) {
        throw new ForbiddenException('Sheikhs may only resolve mistakes for their assigned students.');
      }

      return this.mistakeRepo.resolve(user.tenantId, id, user.sub);
    }

    // STUDENT / PARENT: resolution is a teaching action — not permitted.
    throw new ForbiddenException('Only sheikhs, supervisors, and admins may resolve mistakes.');
  }
}
