import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICircleRepository, CIRCLE_REPOSITORY } from '../../domain/repositories/circle.repository.interface';
import { ISupervisorRepository, SUPERVISOR_REPOSITORY } from '@modules/supervisors/domain/repositories/supervisor.repository.interface';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { UpdateCircleDto } from '../dto/update-circle.dto';

@Injectable()
export class UpdateCircleUseCase {
  constructor(
    @Inject(CIRCLE_REPOSITORY) private readonly circleRepo: ICircleRepository,
    @Inject(SUPERVISOR_REPOSITORY) private readonly supervisorRepo: ISupervisorRepository,
  ) {}

  async execute(tenantId: string, circleId: string, dto: UpdateCircleDto, requester: AccessTokenPayload) {
    const existing = await this.circleRepo.findById(tenantId, circleId);
    if (!existing) throw new NotFoundException('Circle not found.');

    const roles = requester.roles as Role[];

    // SUPERVISOR: may only update circles they are assigned to oversee
    if (!roles.includes(Role.TENANT_ADMIN) && roles.includes(Role.SUPERVISOR)) {
      const supervisor = await this.supervisorRepo.findByUserId(tenantId, requester.sub);
      if (!supervisor || !supervisor.supervisedGroupIds.includes(circleId)) {
        throw new ForbiddenException('Supervisors may only update circles they supervise.');
      }
    }

    return this.circleRepo.update(tenantId, circleId, dto);
  }
}
