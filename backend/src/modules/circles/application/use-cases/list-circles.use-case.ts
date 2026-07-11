import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ICircleRepository, CIRCLE_REPOSITORY } from '../../domain/repositories/circle.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { ISupervisorRepository, SUPERVISOR_REPOSITORY } from '@modules/supervisors/domain/repositories/supervisor.repository.interface';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';

@Injectable()
export class ListCirclesUseCase {
  constructor(
    @Inject(CIRCLE_REPOSITORY) private readonly circleRepo: ICircleRepository,
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
    @Inject(SUPERVISOR_REPOSITORY) private readonly supervisorRepo: ISupervisorRepository,
  ) {}

  async execute(requester: AccessTokenPayload, filter?: { isActive?: boolean }) {
    const { tenantId } = requester;
    const roles = requester.roles as Role[];

    if (roles.includes(Role.TENANT_ADMIN)) {
      return this.circleRepo.findAll(tenantId, filter);
    }

    if (roles.includes(Role.SUPERVISOR)) {
      const supervisor = await this.supervisorRepo.findByUserId(tenantId, requester.sub);
      if (!supervisor) return [];
      return this.circleRepo.findBySupervisor(tenantId, supervisor.id);
    }

    if (roles.includes(Role.SHEIKH)) {
      const sheikh = await this.sheikhRepo.findByUserId(tenantId, requester.sub);
      if (!sheikh) return [];
      return this.circleRepo.findAll(tenantId, { ...filter, sheikhId: sheikh.id });
    }

    throw new ForbiddenException();
  }
}
