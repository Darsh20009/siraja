import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ISupervisorRepository, SUPERVISOR_REPOSITORY } from '../../domain/repositories/supervisor.repository.interface';

@Injectable()
export class GetMySupervisorProfileUseCase {
  constructor(@Inject(SUPERVISOR_REPOSITORY) private readonly supervisorRepo: ISupervisorRepository) {}

  async execute(tenantId: string, userId: string) {
    const supervisor = await this.supervisorRepo.findByUserId(tenantId, userId);
    if (!supervisor) throw new NotFoundException('Supervisor profile not found for this user.');
    return supervisor;
  }
}
