import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IParentRepository, PARENT_REPOSITORY } from '../../domain/repositories/parent.repository.interface';

@Injectable()
export class GetMyParentProfileUseCase {
  constructor(@Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository) {}

  async execute(tenantId: string, userId: string) {
    const parent = await this.parentRepo.findByUserId(tenantId, userId);
    if (!parent) throw new NotFoundException('Parent profile not found for this user.');
    return parent;
  }
}
