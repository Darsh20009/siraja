import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { EXAM_REPOSITORY, IExamRepository } from '../../domain/repositories/exam.repository.interface';
import { CreateExamDto } from '../dto/create-exam.dto';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { Role } from '@shared/enums/roles.enum';
import { ExamResult } from '@shared/enums/exam-assignment.enum';

/**
 * CreateExamUseCase
 *
 * Schedule a formal exam for a student.
 * RBAC: EXAMS.CREATE (Sheikh, Supervisor, Tenant Admin).
 *
 * Sheikh scope: may only schedule exams for students in their circles.
 */
@Injectable()
export class CreateExamUseCase {
  constructor(
    @Inject(EXAM_REPOSITORY)
    private readonly examRepo: IExamRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, dto: CreateExamDto) {
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
        throw new ForbiddenException('Sheikhs may only schedule exams for students in their circles.');
      }
    }

    return this.examRepo.create({
      tenantId: user.tenantId,
      studentId: dto.studentId,
      groupId: dto.groupId ?? student.groupId ?? undefined,
      examinerId: dto.examinerId ?? user.sub,
      category: dto.category,
      type: dto.type,
      scheduledAt: new Date(dto.scheduledAt),
      range: dto.range,
      notes: dto.notes,
    });
  }
}
