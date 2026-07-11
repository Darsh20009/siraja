import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { EXAM_REPOSITORY, IExamRepository } from '../../domain/repositories/exam.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * GetExamUseCase
 *
 * Fetches a single exam record with per-instance ownership enforcement.
 *
 * Ownership rules:
 *   TENANT_ADMIN / SUPERVISOR → unrestricted
 *   SHEIKH     → exam must be in one of their circles (groupId) OR they are the examiner
 *   PARENT     → exam's studentId must be in parent.studentIds
 *   STUDENT    → exam's studentId must match their own profile id
 */
@Injectable()
export class GetExamUseCase {
  constructor(
    @Inject(EXAM_REPOSITORY)
    private readonly examRepo: IExamRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, id: string) {
    const exam = await this.examRepo.findById(user.tenantId, id);
    if (!exam) throw new NotFoundException('Exam not found.');

    const roles = user.roles as Role[];

    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      return exam;
    }

    if (roles.includes(Role.SHEIKH)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');

      const inCircle = exam.groupId != null && sheikh.groupIds.includes(exam.groupId);
      const isExaminer = exam.examinerId === user.sub; // examinerId stores User ObjectId
      if (!inCircle && !isExaminer) {
        throw new ForbiddenException('Sheikhs may only access exams for their circles.');
      }
      return exam;
    }

    if (roles.includes(Role.PARENT)) {
      const parent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!parent || !parent.studentIds.includes(exam.studentId)) {
        throw new ForbiddenException("Parents may only access their linked children's exam records.");
      }
      return exam;
    }

    if (roles.includes(Role.STUDENT)) {
      const profile = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!profile || profile.id !== exam.studentId) {
        throw new ForbiddenException('Students may only access their own exam records.');
      }
      return exam;
    }

    throw new ForbiddenException();
  }
}
