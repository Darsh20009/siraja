import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IParentRepository, PARENT_REPOSITORY } from '../../domain/repositories/parent.repository.interface';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';

@Injectable()
export class GetParentUseCase {
  constructor(@Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository) {}

  async execute(tenantId: string, parentId: string, requester: AccessTokenPayload) {
    const parent = await this.parentRepo.findById(tenantId, parentId);
    if (!parent) throw new NotFoundException('Parent not found.');

    const roles = requester.roles as Role[];
    if (roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPERVISOR)) {
      return parent;
    }

    // Parent may only view their own profile
    if (roles.includes(Role.PARENT)) {
      if (parent.userId !== requester.sub) {
        throw new ForbiddenException('Parents may only access their own profile.');
      }
      return parent;
    }

    throw new ForbiddenException();
  }
}
