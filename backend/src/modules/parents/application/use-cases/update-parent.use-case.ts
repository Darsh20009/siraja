import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IParentRepository, PARENT_REPOSITORY } from '../../domain/repositories/parent.repository.interface';
import { UpdateParentDto } from '../dto/update-parent.dto';

@Injectable()
export class UpdateParentUseCase {
  constructor(@Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository) {}

  async execute(tenantId: string, parentId: string, dto: UpdateParentDto) {
    const existing = await this.parentRepo.findById(tenantId, parentId);
    if (!existing) throw new NotFoundException('Parent not found.');
    return this.parentRepo.update(tenantId, parentId, dto);
  }
}
