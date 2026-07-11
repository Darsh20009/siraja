import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IStudentRepository, STUDENT_REPOSITORY } from '../../domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';

@Injectable()
export class ListStudentsUseCase {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository,
  ) {}

  async execute(requester: AccessTokenPayload, filter?: { isActive?: boolean; groupId?: string }) {
    const { tenantId } = requester;
    const roles = requester.roles as Role[];

    // TENANT_ADMIN / SUPERVISOR: full tenant list
    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      return this.studentRepo.findAll(tenantId, filter);
    }

    // SHEIKH: students in their assigned circles AND directly assigned students
    if (roles.includes(Role.SHEIKH)) {
      const sheikh = await this.sheikhRepo.findByUserId(tenantId, requester.sub);
      if (!sheikh) return [];
      // Pass circleIds so the repository can include circle-based enrollments without
      // a separate Sheikh model lookup inside the repository layer.
      return this.studentRepo.findBySheikh(tenantId, sheikh.id, sheikh.groupIds);
    }

    // PARENT: only their linked children
    if (roles.includes(Role.PARENT)) {
      const parent = await this.parentRepo.findByUserId(tenantId, requester.sub);
      if (!parent) return [];
      return this.studentRepo.findByParent(tenantId, parent.id);
    }

    // STUDENT: should use /students/me instead
    if (roles.includes(Role.STUDENT)) {
      const own = await this.studentRepo.findByUserId(tenantId, requester.sub);
      return own ? [own] : [];
    }

    throw new ForbiddenException();
  }
}
