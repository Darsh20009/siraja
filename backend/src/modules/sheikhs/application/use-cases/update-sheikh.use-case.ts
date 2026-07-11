import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '../../domain/repositories/sheikh.repository.interface';
import { UpdateSheikhDto } from '../dto/update-sheikh.dto';

@Injectable()
export class UpdateSheikhUseCase {
  constructor(@Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository) {}

  async execute(tenantId: string, sheikhId: string, dto: UpdateSheikhDto) {
    const existing = await this.sheikhRepo.findById(tenantId, sheikhId);
    if (!existing) throw new NotFoundException('Sheikh not found.');
    return this.sheikhRepo.update(tenantId, sheikhId, dto);
  }
}
