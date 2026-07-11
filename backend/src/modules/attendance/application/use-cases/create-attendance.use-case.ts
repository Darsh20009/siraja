import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ATTENDANCE_REPOSITORY, IAttendanceRepository } from '../../domain/repositories/attendance.repository.interface';
import { CreateAttendanceDto } from '../dto/create-attendance.dto';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { Role } from '@shared/enums/roles.enum';
import { AttendanceStatus } from '@shared/enums/attendance-status.enum';

/**
 * CreateAttendanceUseCase
 *
 * Mark a single student's attendance for a session/date.
 * RBAC: ATTENDANCE.CREATE (Sheikh, Supervisor, Tenant Admin).
 *
 * Sheikh scope: may only mark attendance for students in their assigned circles.
 * Tenant Admin / Supervisor: unrestricted within the tenant.
 */
@Injectable()
export class CreateAttendanceUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepo: IAttendanceRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, dto: CreateAttendanceDto) {
    const student = await this.studentRepo.findById(user.tenantId, dto.studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];
    let resolvedSheikhId: string | undefined;

    if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');

      const isInCircle =
        student.sheikhId === sheikh.id ||
        (student.groupId != null && sheikh.groupIds.includes(student.groupId));

      if (!isInCircle) {
        throw new ForbiddenException('Sheikhs may only mark attendance for students in their circles.');
      }
      resolvedSheikhId = user.sub;
    }

    const date = dto.date ? new Date(dto.date) : new Date();

    return this.attendanceRepo.create({
      tenantId: user.tenantId,
      sessionId: dto.sessionId,
      studentId: dto.studentId,
      groupId: dto.groupId ?? student.groupId ?? undefined,
      sheikhId: resolvedSheikhId,
      status: dto.status ?? AttendanceStatus.PRESENT,
      date,
      checkedInAt: dto.checkedInAt ? new Date(dto.checkedInAt) : undefined,
      recordedById: user.sub,
      notes: dto.notes,
    });
  }
}
