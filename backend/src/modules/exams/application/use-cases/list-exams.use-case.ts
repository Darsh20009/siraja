import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { EXAM_REPOSITORY, ExamListFilter, IExamRepository } from '../../domain/repositories/exam.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';
import { ExamCategory, ExamResult, ExamStatus } from '@shared/enums/exam-assignment.enum';

export interface ListExamsQuery {
  studentId?: string;
  groupId?: string;
  category?: ExamCategory;
  status?: ExamStatus;
  result?: ExamResult;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
}

@Injectable()
export class ListExamsUseCase {
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

  async execute(user: AccessTokenPayload, query: ListExamsQuery) {
    const roles = user.roles as Role[];
    const filter: ExamListFilter = {
      groupId: query.groupId,
      category: query.category,
      status: query.status,
      result: query.result,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
    };

    if (roles.includes(Role.STUDENT)) {
      const student = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!student) throw new ForbiddenException('Student profile not found.');
      filter.studentId = student.id;
    } else if (roles.includes(Role.PARENT) && !roles.includes(Role.TENANT_ADMIN)) {
      const parent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!parent) throw new ForbiddenException('Parent profile not found.');
      filter.studentIds = parent.studentIds;
    } else if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN)) {
      const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');
      // examinerId stores User ObjectId — filter by userId
      filter.examinerId = sheikh.userId;
    } else if (query.studentId) {
      filter.studentId = query.studentId;
    }

    return this.examRepo.findAll(user.tenantId, filter, query.page, query.limit);
  }
}
