import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '../../domain/repositories/sheikh.repository.interface';

@Injectable()
export class GetSheikhUseCase {
  constructor(@Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository) {}

  async execute(tenantId: string, sheikhId: string) {
    const sheikh = await this.sheikhRepo.findById(tenantId, sheikhId);
    if (!sheikh) throw new NotFoundException('Sheikh not found.');
    return sheikh;
  }
}
