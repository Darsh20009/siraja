import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  IStudentProgressRepository,
  StudentProgressRecord,
  STUDENT_PROGRESS_REPOSITORY,
} from '../../domain/repositories/student-progress.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';

function zeroed(studentId: string): Omit<StudentProgressRecord, 'id' | 'updatedAt'> {
  return {
    studentId,
    totalAyahsMemorized: 0,
    totalPagesMemorized: 0,
    totalJuzMemorized: 0,
    memorizationPercentage: 0,
    totalMemorizationSessions: 0,
    lastMemorizationDate: null,
    totalAyahsRevised: 0,
    revisionPercentage: 0,
    totalRevisionSessions: 0,
    lastRevisionDate: null,
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
  };
}

/**
 * GetStudentProgressUseCase
 *
 * `studentId` may be:
 *  - A Student profile ID (_id) — used when called from /progress/students/:studentId
 *  - user.sub (User ID) — used when called from /progress/me for STUDENT role
 *
 * For STUDENT role, the use-case always resolves the profile via userId so
 * both call sites work correctly regardless of what is passed.
 * For other roles, `studentId` is treated as a Student profile ID.
 */
@Injectable()
export class GetStudentProgressUseCase {
  constructor(
    @Inject(STUDENT_PROGRESS_REPOSITORY)
    private readonly progressRepo: IStudentProgressRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, studentId: string) {
    const roles = user.roles as Role[];

    // ── STUDENT: always resolve from userId, ignore passed studentId ───────
    if (roles.includes(Role.STUDENT)) {
      const ownProfile = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!ownProfile) throw new NotFoundException('Student profile not found.');
      // If called from /students/:id, ensure it's their own profile ID.
      if (studentId !== user.sub && studentId !== ownProfile.id) {
        throw new ForbiddenException('Students may only access their own progress.');
      }
      const progress = await this.progressRepo.findByStudent(user.tenantId, ownProfile.id);
      return progress ?? { ...zeroed(ownProfile.id) };
    }

    // For all other roles, studentId is a Student profile ID.
    const student = await this.studentRepo.findById(user.tenantId, studentId);
    if (!student) throw new NotFoundException('Student not found.');

    // ── TENANT_ADMIN / SUPERVISOR: unrestricted ────────────────────────────
    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      const progress = await this.progressRepo.findByStudent(user.tenantId, studentId);
      return progress ?? { ...zeroed(studentId) };
    }

    // ── SHEIKH: only their accessible students ─────────────────────────────
    if (roles.includes(Role.SHEIKH)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');
      const isAssigned =
        student.sheikhId === sheikh.id ||
        (student.groupId != null && sheikh.groupIds.includes(student.groupId));
      if (!isAssigned) throw new ForbiddenException('Sheikhs may only access their assigned students.');
      const progress = await this.progressRepo.findByStudent(user.tenantId, studentId);
      return progress ?? { ...zeroed(studentId) };
    }

    // ── PARENT: linked children only ──────────────────────────────────────
    if (roles.includes(Role.PARENT)) {
      const parent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!parent || !parent.studentIds.includes(studentId)) {
        throw new ForbiddenException('Parents may only access linked children.');
      }
      const progress = await this.progressRepo.findByStudent(user.tenantId, studentId);
      return progress ?? { ...zeroed(studentId) };
    }

    throw new ForbiddenException();
  }
}
