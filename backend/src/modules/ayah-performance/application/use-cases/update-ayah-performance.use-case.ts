import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  AYAH_PERFORMANCE_REPOSITORY,
  IAyahPerformanceRepository,
} from '../../domain/repositories/ayah-performance.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { UpdateAyahPerformanceDto } from '../dto/update-ayah-performance.dto';
import { Role } from '@shared/enums/roles.enum';

/**
 * UpdateAyahPerformanceUseCase — manual sheikh/admin override of a
 * student's tracked performance for a single ayah. Only Sheikh (own
 * assigned students) and Tenant Admin may write; Supervisor is
 * view-only per the Smart Mushaf role matrix.
 */
@Injectable()
export class UpdateAyahPerformanceUseCase {
  constructor(
    @Inject(AYAH_PERFORMANCE_REPOSITORY)
    private readonly performanceRepo: IAyahPerformanceRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(
    user: AccessTokenPayload,
    studentId: string,
    surahNumber: number,
    ayahNumber: number,
    dto: UpdateAyahPerformanceDto,
  ) {
    const student = await this.studentRepo.findById(user.tenantId, studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];
    if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');
      const isAssigned =
        student.sheikhId === sheikh.id || (student.groupId != null && sheikh.groupIds.includes(student.groupId));
      if (!isAssigned) throw new ForbiddenException('Sheikhs may only update their assigned students.');
    } else if (!roles.includes(Role.TENANT_ADMIN) && !roles.includes(Role.SHEIKH)) {
      throw new ForbiddenException();
    }

    return this.performanceRepo.manualUpdate(user.tenantId, studentId, surahNumber, ayahNumber, dto);
  }
}
