import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICircleRepository, CIRCLE_REPOSITORY } from '../../domain/repositories/circle.repository.interface';
import { ISupervisorRepository, SUPERVISOR_REPOSITORY } from '@modules/supervisors/domain/repositories/supervisor.repository.interface';

@Injectable()
export class AssignSupervisorToCircleUseCase {
  constructor(
    @Inject(CIRCLE_REPOSITORY) private readonly circleRepo: ICircleRepository,
    @Inject(SUPERVISOR_REPOSITORY) private readonly supervisorRepo: ISupervisorRepository,
  ) {}

  async execute(tenantId: string, circleId: string, supervisorId: string) {
    const [circle, supervisor] = await Promise.all([
      this.circleRepo.findById(tenantId, circleId),
      this.supervisorRepo.findById(tenantId, supervisorId),
    ]);
    if (!circle) throw new NotFoundException('Circle not found.');
    if (!supervisor) throw new NotFoundException('Supervisor not found.');

    if (circle.supervisorId && circle.supervisorId !== supervisorId) {
      await this.supervisorRepo.removeGroup(tenantId, circle.supervisorId, circleId);
    }

    await Promise.all([
      this.circleRepo.setSupervisor(tenantId, circleId, supervisorId),
      this.supervisorRepo.addGroup(tenantId, supervisorId, circleId),
    ]);

    return this.circleRepo.findById(tenantId, circleId);
  }
}
