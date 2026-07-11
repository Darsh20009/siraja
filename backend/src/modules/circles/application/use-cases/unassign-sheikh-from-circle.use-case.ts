import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICircleRepository, CIRCLE_REPOSITORY } from '../../domain/repositories/circle.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';

@Injectable()
export class UnassignSheikhFromCircleUseCase {
  constructor(
    @Inject(CIRCLE_REPOSITORY) private readonly circleRepo: ICircleRepository,
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
  ) {}

  async execute(tenantId: string, circleId: string) {
    const circle = await this.circleRepo.findById(tenantId, circleId);
    if (!circle) throw new NotFoundException('Circle not found.');
    if (!circle.sheikhId) return; // already unassigned

    await Promise.all([
      this.circleRepo.setSheikh(tenantId, circleId, null),
      this.sheikhRepo.removeGroup(tenantId, circle.sheikhId, circleId),
    ]);
  }
}
