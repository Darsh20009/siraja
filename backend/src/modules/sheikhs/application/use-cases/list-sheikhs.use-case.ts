import { Inject, Injectable } from '@nestjs/common';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '../../domain/repositories/sheikh.repository.interface';

@Injectable()
export class ListSheikhsUseCase {
  constructor(@Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository) {}

  execute(tenantId: string, filter?: { isActive?: boolean }) {
    return this.sheikhRepo.findAll(tenantId, filter);
  }
}
