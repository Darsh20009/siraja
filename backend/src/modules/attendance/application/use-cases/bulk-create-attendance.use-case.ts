import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ATTENDANCE_REPOSITORY, CreateAttendanceInput, IAttendanceRepository } from '../../domain/repositories/attendance.repository.interface';
import { BulkCreateAttendanceDto } from '../dto/bulk-create-attendance.dto';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { Role } from '@shared/enums/roles.enum';
import { AttendanceStatus } from '@shared/enums/attendance-status.enum';

/**
 * BulkCreateAttendanceUseCase
 *
 * Mark attendance for a whole circle in a single request — the typical sheikh
 * end-of-session flow where all students are marked at once.
 *
 * RBAC: ATTENDANCE.CREATE (Sheikh, Supervisor, Tenant Admin).
 *
 * Sheikh scope: per-record student validation — each student must belong to the
 * sheikh's circles or be directly assigned. Fails if ANY record is out-of-scope.
 * This mirrors the single-create scope guard in CreateAttendanceUseCase.
 */
@Injectable()
export class BulkCreateAttendanceUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepo: IAttendanceRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
  ) {}

  async execute(user: AccessTokenPayload, dto: BulkCreateAttendanceDto) {
    const roles = user.roles as Role[];
    let resolvedSheikhId: string | undefined;
    let sheikhGroupIds: string[] = [];
    let sheikhProfileId: string | undefined;

    if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');
      resolvedSheikhId = user.sub; // User ObjectId stored on attendance.sheikh
      sheikhGroupIds = sheikh.groupIds;
      sheikhProfileId = sheikh.id;

      // Validate every student record is in-scope before writing any record.
      const validationErrors: string[] = [];
      for (const record of dto.records) {
        const student = await this.studentRepo.findById(user.tenantId, record.studentId);
        if (!student) {
          validationErrors.push(`Student ${record.studentId} not found.`);
          continue;
        }
        const inCircle = student.groupId != null && sheikhGroupIds.includes(student.groupId);
        const directlyAssigned = student.sheikhId === sheikhProfileId;
        if (!inCircle && !directlyAssigned) {
          validationErrors.push(
            `Student ${record.studentId} is not in your circles — cannot mark their attendance.`,
          );
        }
      }

      if (validationErrors.length > 0) {
        throw new BadRequestException(validationErrors);
      }
    }

    const sharedDate = dto.date ? new Date(dto.date) : new Date();

    const inputs: CreateAttendanceInput[] = dto.records.map((record) => ({
      tenantId: user.tenantId,
      sessionId: dto.sessionId ?? record.sessionId,
      studentId: record.studentId,
      groupId: dto.groupId ?? record.groupId,
      sheikhId: resolvedSheikhId,
      status: record.status ?? AttendanceStatus.PRESENT,
      date: record.date ? new Date(record.date) : sharedDate,
      checkedInAt: record.checkedInAt ? new Date(record.checkedInAt) : undefined,
      recordedById: user.sub,
      notes: record.notes,
    }));

    return this.attendanceRepo.bulkCreate(inputs);
  }
}
