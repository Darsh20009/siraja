import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  IQuranMistakeRepository,
  QURAN_MISTAKE_REPOSITORY,
} from '../../domain/repositories/quran-mistake.repository.interface';
import { LogMistakeDto } from '../dto/log-mistake.dto';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { Role } from '@shared/enums/roles.enum';
import {
  AYAH_PERFORMANCE_REPOSITORY,
  IAyahPerformanceRepository,
} from '@modules/ayah-performance/domain/repositories/ayah-performance.repository.interface';

/**
 * LogMistakeUseCase
 *
 * dto.studentId is a Student profile ID.
 * Sheikh may only log mistakes for their assigned/circle students.
 */
@Injectable()
export class LogMistakeUseCase {
  constructor(
    @Inject(QURAN_MISTAKE_REPOSITORY)
    private readonly mistakeRepo: IQuranMistakeRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(AYAH_PERFORMANCE_REPOSITORY)
    private readonly ayahPerformanceRepo: IAyahPerformanceRepository,
  ) {}

  async execute(user: AccessTokenPayload, dto: LogMistakeDto) {
    if (!dto.memorizationRecordId && !dto.reviewRecordId) {
      throw new BadRequestException(
        'A mistake must be linked to either a memorizationRecordId or a reviewRecordId.',
      );
    }

    const student = await this.studentRepo.findById(user.tenantId, dto.studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];

    // Sheikh ownership: may only log mistakes for their accessible students.
    if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');
      const isAssigned =
        student.sheikhId === sheikh.id ||
        (student.groupId != null && sheikh.groupIds.includes(student.groupId));
      if (!isAssigned) {
        throw new ForbiddenException('Sheikhs may only log mistakes for their assigned students.');
      }
    }

    const mistake = await this.mistakeRepo.log({
      tenantId: user.tenantId,
      studentId: dto.studentId,
      memorizationRecordId: dto.memorizationRecordId,
      reviewRecordId: dto.reviewRecordId,
      surahNumber: dto.surahNumber,
      ayahNumber: dto.ayahNumber,
      type: dto.type,
      severity: dto.severity,
      note: dto.note,
    });

    // Smart Mushaf: materialise per-ayah performance for this ayah (fire-and-forget).
    this.ayahPerformanceRepo
      .recordMistake(user.tenantId, dto.studentId, dto.surahNumber, dto.ayahNumber)
      .catch(() => {});

    return mistake;
  }
}
