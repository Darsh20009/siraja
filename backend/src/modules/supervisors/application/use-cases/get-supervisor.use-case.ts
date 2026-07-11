import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ISupervisorRepository, SUPERVISOR_REPOSITORY } from '../../domain/repositories/supervisor.repository.interface';

@Injectable()
export class GetSupervisorUseCase {
  constructor(@Inject(SUPERVISOR_REPOSITORY) private readonly supervisorRepo: ISupervisorRepository) {}

  async execute(tenantId: string, supervisorId: string) {
    const supervisor = await this.supervisorRepo.findById(tenantId, supervisorId);
    if (!supervisor) throw new NotFoundException('Supervisor not found.');
    return supervisor;
  }
}
