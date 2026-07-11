import { ForbiddenException } from '@nestjs/common';
import { Role } from '@shared/enums/roles.enum';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { StudentRecord } from '@modules/students/domain/repositories/student.repository.interface';
import { SheikhRecord } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { ParentRecord } from '@modules/parents/domain/repositories/parent.repository.interface';

/**
 * Shared four-branch student-ownership check: TENANT_ADMIN/SUPERVISOR are
 * unrestricted, SHEIKH is limited to their assigned/circle students,
 * PARENT is limited to linked children, STUDENT is limited to their own
 * profile. Mirrors the pattern established independently in
 * `GetStudentProgressUseCase` and `GetMistakeFrequencyUseCase` (Phase 7);
 * factored out here because the Smart Mushaf Engine (Phase 9) introduces
 * five call sites for the same check.
 *
 * Callers only need to resolve `sheikh`/`parent`/`ownStudentProfileId`
 * when the caller's roles could plausibly need them (see call sites) —
 * this function does not fetch anything itself.
 */
export function assertCanAccessStudent(
  user: AccessTokenPayload,
  student: StudentRecord,
  options: { sheikh?: SheikhRecord | null; parent?: ParentRecord | null; ownStudentProfileId?: string | null } = {},
): void {
  const roles = user.roles as Role[];

  if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) return;

  if (roles.includes(Role.STUDENT)) {
    if (options.ownStudentProfileId !== student.id) {
      throw new ForbiddenException('Students may only access their own data.');
    }
    return;
  }

  if (roles.includes(Role.SHEIKH)) {
    if (!options.sheikh) throw new ForbiddenException('Sheikh profile not found.');
    const isAssigned =
      student.sheikhId === options.sheikh.id ||
      (student.groupId != null && options.sheikh.groupIds.includes(student.groupId));
    if (!isAssigned) throw new ForbiddenException('Sheikhs may only access their assigned students.');
    return;
  }

  if (roles.includes(Role.PARENT)) {
    if (!options.parent || !options.parent.studentIds.includes(student.id)) {
      throw new ForbiddenException('Parents may only access linked children.');
    }
    return;
  }

  throw new ForbiddenException();
}
