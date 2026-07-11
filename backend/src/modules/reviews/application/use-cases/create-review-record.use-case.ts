import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  IReviewRecordRepository,
  REVIEW_RECORD_REPOSITORY,
} from '../../domain/repositories/review-record.repository.interface';
import { CreateReviewRecordDto } from '../dto/create-review-record.dto';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { UpdateStudentProgressUseCase } from '@modules/progress/application/use-cases/update-student-progress.use-case';
import { Role } from '@shared/enums/roles.enum';

/**
 * CreateReviewRecordUseCase
 *
 * dto.studentId is a Student profile ID (_id), not a User ID.
 * Sheikh may only log revisions for their assigned/circle students.
 */
@Injectable()
export class CreateReviewRecordUseCase {
  constructor(
    @Inject(REVIEW_RECORD_REPOSITORY)
    private readonly reviewRepo: IReviewRecordRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    private readonly updateProgress: UpdateStudentProgressUseCase,
  ) {}

  async execute(user: AccessTokenPayload, dto: CreateReviewRecordDto) {
    const student = await this.studentRepo.findById(user.tenantId, dto.studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];

    // Sheikh ownership check.
    if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');
      const isAssigned =
        student.sheikhId === sheikh.id ||
        (student.groupId != null && sheikh.groupIds.includes(student.groupId));
      if (!isAssigned) {
        throw new ForbiddenException('Sheikhs may only log revisions for their assigned students.');
      }
    }

    const record = await this.reviewRepo.create({
      tenantId: user.tenantId,
      studentId: dto.studentId,
      sessionId: dto.sessionId,
      reviewedById: user.sub, // reviewedBy is a User reference — user.sub is correct
      range: dto.range,
      retentionGrade: dto.retentionGrade,
      nextReviewDueAt: dto.nextReviewDueAt ? new Date(dto.nextReviewDueAt) : undefined,
      notes: dto.notes,
      reviewedAt: dto.reviewedAt ? new Date(dto.reviewedAt) : undefined,
    });

    this.updateProgress.execute(user.tenantId, dto.studentId).catch(() => {});

    return record;
  }
}
