import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICircleRepository, CIRCLE_REPOSITORY } from '../../domain/repositories/circle.repository.interface';

/**
 * Soft-deletes a circle by setting `isDeleted = true` and `deletedAt = now`.
 * All list/findById queries filter on `isDeleted: false`, so a removed circle
 * disappears from every operational view immediately.
 *
 * Distinct from deactivation (`isActive = false`), which keeps the circle
 * visible but marks it as no longer scheduling sessions.
 */
@Injectable()
export class RemoveCircleUseCase {
  constructor(@Inject(CIRCLE_REPOSITORY) private readonly circleRepo: ICircleRepository) {}

  async execute(tenantId: string, circleId: string): Promise<void> {
    const existing = await this.circleRepo.findById(tenantId, circleId);
    if (!existing) throw new NotFoundException('Circle not found.');
    await this.circleRepo.remove(tenantId, circleId);
  }
}
