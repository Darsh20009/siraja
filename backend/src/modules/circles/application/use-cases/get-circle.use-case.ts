import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICircleRepository, CIRCLE_REPOSITORY } from '../../domain/repositories/circle.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { ISupervisorRepository, SUPERVISOR_REPOSITORY } from '@modules/supervisors/domain/repositories/supervisor.repository.interface';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';

@Injectable()
export class GetCircleUseCase {
  constructor(
    @Inject(CIRCLE_REPOSITORY) private readonly circleRepo: ICircleRepository,
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
    @Inject(SUPERVISOR_REPOSITORY) private readonly supervisorRepo: ISupervisorRepository,
  ) {}

  async execute(tenantId: string, circleId: string, requester: AccessTokenPayload) {
    const circle = await this.circleRepo.findById(tenantId, circleId);
    if (!circle) throw new NotFoundException('Circle not found.');

    const roles = requester.roles as Role[];

    if (roles.includes(Role.TENANT_ADMIN)) return circle;

    if (roles.includes(Role.SUPERVISOR)) {
      const supervisor = await this.supervisorRepo.findByUserId(tenantId, requester.sub);
      if (!supervisor || !supervisor.supervisedGroupIds.includes(circleId)) {
        throw new ForbiddenException('Supervisors may only access their assigned circles.');
      }
      return circle;
    }

    if (roles.includes(Role.SHEIKH)) {
      const sheikh = await this.sheikhRepo.findByUserId(tenantId, requester.sub);
      if (!sheikh || !sheikh.groupIds.includes(circleId)) {
        throw new ForbiddenException('Sheikhs may only access their assigned circles.');
      }
      return circle;
    }

    throw new ForbiddenException();
  }
}
