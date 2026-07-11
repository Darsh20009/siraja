import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ASSESSMENT_REPOSITORY, IAssessmentRepository } from '../../domain/repositories/assessment.repository.interface';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * CreateAssessmentUseCase
 *
 * Sheikh creates a periodic assessment for a student.
 * RBAC: REPORTS.READ (Sheikh, Supervisor, Tenant Admin) — assessments are
 *       part of the reporting engine and gated on the same permission group.
 *
 * Sheikh scope: may only assess students in their circles.
 */
@Injectable()
export class CreateAssessmentUseCase {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepo: IAssessmentRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, dto: CreateAssessmentDto) {
    const student = await this.studentRepo.findById(user.tenantId, dto.studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];

    if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');

      const isInCircle =
        student.sheikhId === sheikh.id ||
        (student.groupId != null && sheikh.groupIds.includes(student.groupId));

      if (!isInCircle) {
        throw new ForbiddenException('Sheikhs may only create assessments for students in their circles.');
      }
    }

    return this.assessmentRepo.create({
      tenantId: user.tenantId,
      studentId: dto.studentId,
      groupId: dto.groupId ?? student.groupId ?? undefined,
      assessedById: user.sub,
      type: dto.type,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      score: dto.score,
      grade: dto.grade,
      title: dto.title,
      notes: dto.notes,
    });
  }
}
