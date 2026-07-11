import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  IMemorizationRecordRepository,
  MEMORIZATION_RECORD_REPOSITORY,
} from '../../domain/repositories/memorization-record.repository.interface';
import { ApproveMemorizationRecordDto } from '../dto/approve-memorization-record.dto';
import { MemorizationStatus } from '@shared/enums/memorization.enum';
import { UpdateStudentProgressUseCase } from '@modules/progress/application/use-cases/update-student-progress.use-case';
import { Role } from '@shared/enums/roles.enum';
import {
  AYAH_PERFORMANCE_REPOSITORY,
  IAyahPerformanceRepository,
} from '@modules/ayah-performance/domain/repositories/ayah-performance.repository.interface';
import { AYAH_REPOSITORY, IAyahRepository } from '@modules/ayahs/domain/repositories/ayah.repository.interface';
import { resolveAyahsInRange } from '@shared/utils/quran-range.util';

/**
 * ApproveMemorizationRecordUseCase
 *
 * Finalises a memorization evaluation — sets status to COMPLETED and records
 * the grade/score assigned by the sheikh.
 * RBAC: MEMORIZATION.APPROVE (sheikh / supervisor / tenant admin).
 *
 * Sheikh ownership: a sheikh may only approve records they personally created
 * (evaluatedBy references User._id, so user.sub comparison is correct).
 * Supervisors and Tenant Admins may approve any record in the tenant.
 */
@Injectable()
export class ApproveMemorizationRecordUseCase {
  constructor(
    @Inject(MEMORIZATION_RECORD_REPOSITORY)
    private readonly memorizationRepo: IMemorizationRecordRepository,
    private readonly updateProgress: UpdateStudentProgressUseCase,
    @Inject(AYAH_PERFORMANCE_REPOSITORY)
    private readonly ayahPerformanceRepo: IAyahPerformanceRepository,
    @Inject(AYAH_REPOSITORY)
    private readonly ayahRepo: IAyahRepository,
  ) {}

  async execute(user: AccessTokenPayload, id: string, dto: ApproveMemorizationRecordDto) {
    const record = await this.memorizationRepo.findById(user.tenantId, id);
    if (!record) throw new NotFoundException('Memorization record not found.');

    const roles = user.roles as Role[];

    // Sheikh may only approve records they evaluated.
    if (
      roles.includes(Role.SHEIKH) &&
      !roles.includes(Role.TENANT_ADMIN) &&
      !roles.includes(Role.SUPERVISOR)
    ) {
      if (record.evaluatedById !== user.sub) {
        throw new ForbiddenException('Sheikhs may only approve records they personally evaluated.');
      }
    }

    const updated = await this.memorizationRepo.update(user.tenantId, id, {
      status: MemorizationStatus.COMPLETED,
      grade: dto.grade,
      score: dto.score,
      notes: dto.notes ?? record.notes,
    });

    // Completing a record changes the memorized ayah count — refresh progress.
    this.updateProgress.execute(user.tenantId, record.studentId).catch(() => {});

    // Smart Mushaf: materialise per-ayah performance for every ayah this
    // record covers (fire-and-forget, same pattern as progress refresh above).
    resolveAyahsInRange(this.ayahRepo, record.range)
      .then((ayahs) =>
        Promise.all(
          ayahs.map(({ surahNumber, ayahNumber }) =>
            this.ayahPerformanceRepo.recordMemorization(user.tenantId, record.studentId, surahNumber, ayahNumber, dto.grade),
          ),
        ),
      )
      .catch(() => {});

    return updated;
  }
}
