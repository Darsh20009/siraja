import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { ASSIGNMENT_REPOSITORY, AssignmentListFilter, IAssignmentRepository } from '../../domain/repositories/assignment.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { Role } from '@shared/enums/roles.enum';
import { AssignmentStatus, AssignmentType } from '@shared/enums/exam-assignment.enum';

export interface ListAssignmentsQuery {
  studentId?: string;
  groupId?: string;
  type?: AssignmentType;
  status?: AssignmentStatus;
  fromDue?: string;
  toDue?: string;
  page: number;
  limit: number;
}

@Injectable()
export class ListAssignmentsUseCase {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: IAssignmentRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
  ) {}

  async execute(user: AccessTokenPayload, query: ListAssignmentsQuery) {
    const roles = user.roles as Role[];
    const filter: AssignmentListFilter = {
      groupId: query.groupId,
      type: query.type,
      status: query.status,
      fromDue: query.fromDue ? new Date(query.fromDue) : undefined,
      toDue: query.toDue ? new Date(query.toDue) : undefined,
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
      // assignedBy stores User ObjectId
      filter.assignedById = sheikh.userId;
    } else if (query.studentId) {
      filter.studentId = query.studentId;
    }

    return this.assignmentRepo.findAll(user.tenantId, filter, query.page, query.limit);
  }
}
