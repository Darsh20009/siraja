import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICircleRepository, CIRCLE_REPOSITORY } from '../../domain/repositories/circle.repository.interface';
import { ISupervisorRepository, SUPERVISOR_REPOSITORY } from '@modules/supervisors/domain/repositories/supervisor.repository.interface';

@Injectable()
export class UnassignSupervisorFromCircleUseCase {
  constructor(
    @Inject(CIRCLE_REPOSITORY) private readonly circleRepo: ICircleRepository,
    @Inject(SUPERVISOR_REPOSITORY) private readonly supervisorRepo: ISupervisorRepository,
  ) {}

  async execute(tenantId: string, circleId: string) {
    const circle = await this.circleRepo.findById(tenantId, circleId);
    if (!circle) throw new NotFoundException('Circle not found.');
    if (!circle.supervisorId) return;

    await Promise.all([
      this.circleRepo.setSupervisor(tenantId, circleId, null),
      this.supervisorRepo.removeGroup(tenantId, circle.supervisorId, circleId),
    ]);
  }
}
