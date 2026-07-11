import { Inject, Injectable } from '@nestjs/common';
import { ISupervisorRepository, SUPERVISOR_REPOSITORY } from '../../domain/repositories/supervisor.repository.interface';

@Injectable()
export class ListSupervisorsUseCase {
  constructor(@Inject(SUPERVISOR_REPOSITORY) private readonly supervisorRepo: ISupervisorRepository) {}

  execute(tenantId: string, filter?: { isActive?: boolean }) {
    return this.supervisorRepo.findAll(tenantId, filter);
  }
}
