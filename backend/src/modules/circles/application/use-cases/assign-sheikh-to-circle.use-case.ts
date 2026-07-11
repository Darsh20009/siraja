import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICircleRepository, CIRCLE_REPOSITORY } from '../../domain/repositories/circle.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';

@Injectable()
export class AssignSheikhToCircleUseCase {
  constructor(
    @Inject(CIRCLE_REPOSITORY) private readonly circleRepo: ICircleRepository,
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
  ) {}

  /**
   * Assigns `sheikhId` to `circleId`, syncing both sides of the relationship:
   *   - circle.sheikh = sheikhId
   *   - previousSheikh.groups removes circleId (if any)
   *   - newSheikh.groups adds circleId
   */
  async execute(tenantId: string, circleId: string, sheikhId: string) {
    const [circle, sheikh] = await Promise.all([
      this.circleRepo.findById(tenantId, circleId),
      this.sheikhRepo.findById(tenantId, sheikhId),
    ]);
    if (!circle) throw new NotFoundException('Circle not found.');
    if (!sheikh) throw new NotFoundException('Sheikh not found.');

    // Unlink previous sheikh if there is one and it is different
    if (circle.sheikhId && circle.sheikhId !== sheikhId) {
      await this.sheikhRepo.removeGroup(tenantId, circle.sheikhId, circleId);
    }

    await Promise.all([
      this.circleRepo.setSheikh(tenantId, circleId, sheikhId),
      this.sheikhRepo.addGroup(tenantId, sheikhId, circleId),
    ]);

    return this.circleRepo.findById(tenantId, circleId);
  }
}
