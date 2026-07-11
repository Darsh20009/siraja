import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ASSESSMENT_REPOSITORY, AssessmentListFilter, IAssessmentRepository } from '../../domain/repositories/assessment.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { Role } from '@shared/enums/roles.enum';
import { AssessmentStatus, AssessmentType } from '@shared/enums/exam-assignment.enum';

export interface ListAssessmentsQuery {
  studentId?: string;
  groupId?: string;
  type?: AssessmentType;
  status?: AssessmentStatus;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
}

/**
 * ListAssessmentsUseCase
 *
 * Role-scoped listing — fails closed when profile lookup fails:
 *   STUDENT      → own records only
 *   PARENT       → linked children only
 *   SHEIKH       → assessments they authored (assessedBy === user.sub)
 *   SUPERVISOR   → all groups in tenant (filter by groupId if provided)
 *   ADMIN        → full tenant access
 */
@Injectable()
export class ListAssessmentsUseCase {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepo: IAssessmentRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(user: AccessTokenPayload, query: ListAssessmentsQuery) {
    const roles = user.roles as Role[];
    const filter: AssessmentListFilter = {
      groupId: query.groupId,
      type: query.type,
      status: query.status,
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
    } else if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN) && !roles.includes(Role.SUPERVISOR)) {
      // Sheikh can only see assessments they authored (assessedBy stores User ObjectId = user.sub)
      filter.assessedById = user.sub;
    } else if (query.studentId) {
      // Supervisor / Admin: respect explicit studentId filter if provided
      filter.studentId = query.studentId;
    }

    return this.assessmentRepo.findAll(user.tenantId, filter, query.page, query.limit);
  }
}
