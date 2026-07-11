import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { EXAM_REPOSITORY, IExamRepository } from '../../domain/repositories/exam.repository.interface';
import { GradeExamDto } from '../dto/grade-exam.dto';
import { ExamStatus } from '@shared/enums/exam-assignment.enum';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * GradeExamUseCase
 *
 * Examiner finalises an exam with a score, grade, and pass/fail result.
 * Transitions status: SCHEDULED | IN_PROGRESS → GRADED.
 * RBAC: EXAMS.APPROVE (Sheikh, Supervisor, Tenant Admin).
 *
 * Ownership:
 *   SHEIKH     → exam must be in one of their circles OR they are the examiner
 *   SUPERVISOR / TENANT_ADMIN → unrestricted within tenant
 */
@Injectable()
export class GradeExamUseCase {
  constructor(
    @Inject(EXAM_REPOSITORY)
    private readonly examRepo: IExamRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, id: string, dto: GradeExamDto) {
    const exam = await this.examRepo.findById(user.tenantId, id);
    if (!exam) throw new NotFoundException('Exam not found.');

    if (exam.status === ExamStatus.CANCELLED) {
      throw new BadRequestException('Cannot grade a cancelled exam.');
    }
    if (exam.status === ExamStatus.GRADED) {
      throw new BadRequestException('Exam has already been graded.');
    }

    const roles = user.roles as Role[];

    if (!roles.includes(Role.TENANT_ADMIN) && !roles.includes(Role.SUPERVISOR)) {
      if (roles.includes(Role.SHEIKH)) {
        const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
        if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');

        const inCircle = exam.groupId != null && sheikh.groupIds.includes(exam.groupId);
        const isExaminer = exam.examinerId === user.sub; // examinerId stores User ObjectId
        if (!inCircle && !isExaminer) {
          throw new ForbiddenException('Sheikhs may only grade exams in their circles or that they are examining.');
        }
      } else {
        throw new ForbiddenException();
      }
    }

    return this.examRepo.grade(user.tenantId, id, {
      score: dto.score,
      grade: dto.grade,
      result: dto.result,
      notes: dto.notes,
    });
  }
}
