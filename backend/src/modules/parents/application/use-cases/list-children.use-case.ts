import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IParentRepository, PARENT_REPOSITORY } from '../../domain/repositories/parent.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';

@Injectable()
export class ListChildrenUseCase {
  constructor(
    @Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository,
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
  ) {}

  async execute(tenantId: string, parentId: string, requester: AccessTokenPayload) {
    const parent = await this.parentRepo.findById(tenantId, parentId);
    if (!parent) throw new NotFoundException('Parent not found.');

    const roles = requester.roles as Role[];
    // Ownership: parent can only view their own children; admin/supervisor can view any
    if (roles.includes(Role.PARENT) && parent.userId !== requester.sub) {
      throw new ForbiddenException('Parents may only view their own children.');
    }

    // Resolve each child's student record
    const children = await Promise.all(
      parent.studentIds.map((id) => this.studentRepo.findById(tenantId, id)),
    );
    return children.filter(Boolean);
  }
}
