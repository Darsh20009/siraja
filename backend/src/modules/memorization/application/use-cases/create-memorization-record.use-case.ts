import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  IMemorizationRecordRepository,
  MEMORIZATION_RECORD_REPOSITORY,
} from '../../domain/repositories/memorization-record.repository.interface';
import { CreateMemorizationRecordDto } from '../dto/create-memorization-record.dto';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { UpdateStudentProgressUseCase } from '@modules/progress/application/use-cases/update-student-progress.use-case';
import { Role } from '@shared/enums/roles.enum';

/**
 * CreateMemorizationRecordUseCase
 *
 * A sheikh logs a new memorization evaluation for a student.
 * RBAC: MEMORIZATION.CREATE (sheikh / tenant admin).
 *
 * Ownership: sheikh may only create records for students assigned to them
 * or enrolled in their circles. Tenant Admin is unrestricted.
 *
 * dto.studentId is a Student profile ID (_id), not a User ID.
 */
@Injectable()
export class CreateMemorizationRecordUseCase {
  constructor(
    @Inject(MEMORIZATION_RECORD_REPOSITORY)
    private readonly memorizationRepo: IMemorizationRecordRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    private readonly updateProgress: UpdateStudentProgressUseCase,
  ) {}

  async execute(user: AccessTokenPayload, dto: CreateMemorizationRecordDto) {
    const student = await this.studentRepo.findById(user.tenantId, dto.studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];

    // SHEIKH: verify the student is assigned to them or in one of their circles.
    if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');

      const isAssigned =
        student.sheikhId === sheikh.id ||
        (student.groupId != null && sheikh.groupIds.includes(student.groupId));

      if (!isAssigned) {
        throw new ForbiddenException('Sheikhs may only record evaluations for their assigned students.');
      }
    }

    const record = await this.memorizationRepo.create({
      tenantId: user.tenantId,
      studentId: dto.studentId,
      sessionId: dto.sessionId,
      evaluatedById: user.sub, // evaluatedBy is a User reference — user.sub is correct
      range: dto.range,
      notes: dto.notes,
    });

    // Update materialised progress — fire-and-forget, non-fatal.
    this.updateProgress.execute(user.tenantId, dto.studentId).catch(() => {});

    return record;
  }
}
