import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ATTENDANCE_REPOSITORY, IAttendanceRepository } from '../../domain/repositories/attendance.repository.interface';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * UpdateAttendanceUseCase
 *
 * Correct a previously recorded status (e.g. Absent → Excused after a note is received).
 * RBAC: ATTENDANCE.UPDATE (Sheikh, Supervisor, Tenant Admin).
 *
 * Ownership:
 *   SHEIKH     → record must belong to one of their circles (groupId in sheikh.groupIds)
 *                OR they originally recorded it (sheikhId === user.sub)
 *   SUPERVISOR / TENANT_ADMIN → unrestricted within tenant
 */
@Injectable()
export class UpdateAttendanceUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepo: IAttendanceRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, id: string, dto: UpdateAttendanceDto) {
    const existing = await this.attendanceRepo.findById(user.tenantId, id);
    if (!existing) throw new NotFoundException('Attendance record not found.');

    const roles = user.roles as Role[];

    if (!roles.includes(Role.TENANT_ADMIN) && !roles.includes(Role.SUPERVISOR)) {
      if (roles.includes(Role.SHEIKH)) {
        const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
        if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');

        const inCircle = existing.groupId != null && sheikh.groupIds.includes(existing.groupId);
        const recorded = existing.sheikhId === user.sub;
        if (!inCircle && !recorded) {
          throw new ForbiddenException('Sheikhs may only update attendance records for their circles.');
        }
      } else {
        throw new ForbiddenException();
      }
    }

    return this.attendanceRepo.update(user.tenantId, id, {
      status: dto.status,
      checkedInAt: dto.checkedInAt ? new Date(dto.checkedInAt) : undefined,
      notes: dto.notes,
    });
  }
}
