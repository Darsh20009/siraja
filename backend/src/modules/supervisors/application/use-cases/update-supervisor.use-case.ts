import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ISupervisorRepository, SUPERVISOR_REPOSITORY } from '../../domain/repositories/supervisor.repository.interface';
import { UpdateSupervisorDto } from '../dto/update-supervisor.dto';

@Injectable()
export class UpdateSupervisorUseCase {
  constructor(@Inject(SUPERVISOR_REPOSITORY) private readonly supervisorRepo: ISupervisorRepository) {}

  async execute(tenantId: string, supervisorId: string, dto: UpdateSupervisorDto) {
    const existing = await this.supervisorRepo.findById(tenantId, supervisorId);
    if (!existing) throw new NotFoundException('Supervisor not found.');
    return this.supervisorRepo.update(tenantId, supervisorId, dto);
  }
}
