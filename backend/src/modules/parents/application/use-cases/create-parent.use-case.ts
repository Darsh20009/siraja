import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { IParentRepository, PARENT_REPOSITORY } from '../../domain/repositories/parent.repository.interface';
import { CreateParentDto } from '../dto/create-parent.dto';

@Injectable()
export class CreateParentUseCase {
  constructor(@Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository) {}

  async execute(tenantId: string, dto: CreateParentDto) {
    const existing = await this.parentRepo.findByUserId(tenantId, dto.userId);
    if (existing) {
      throw new ConflictException('A parent profile already exists for this user in the tenant.');
    }
    return this.parentRepo.create({ tenantId, userId: dto.userId, relationship: dto.relationship });
  }
}
