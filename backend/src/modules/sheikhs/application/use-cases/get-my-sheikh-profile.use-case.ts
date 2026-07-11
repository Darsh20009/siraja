import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '../../domain/repositories/sheikh.repository.interface';

@Injectable()
export class GetMySheikhProfileUseCase {
  constructor(@Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository) {}

  async execute(tenantId: string, userId: string) {
    const sheikh = await this.sheikhRepo.findByUserId(tenantId, userId);
    if (!sheikh) throw new NotFoundException('Sheikh profile not found for this user.');
    return sheikh;
  }
}
