import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ISupervisorRepository, SUPERVISOR_REPOSITORY } from '../../domain/repositories/supervisor.repository.interface';
import { CreateSupervisorDto } from '../dto/create-supervisor.dto';

@Injectable()
export class CreateSupervisorUseCase {
  constructor(@Inject(SUPERVISOR_REPOSITORY) private readonly supervisorRepo: ISupervisorRepository) {}

  async execute(tenantId: string, dto: CreateSupervisorDto) {
    const existing = await this.supervisorRepo.findByUserId(tenantId, dto.userId);
    if (existing) {
      throw new ConflictException('A supervisor profile already exists for this user in the tenant.');
    }
    return this.supervisorRepo.create({ tenantId, userId: dto.userId, department: dto.department });
  }
}
