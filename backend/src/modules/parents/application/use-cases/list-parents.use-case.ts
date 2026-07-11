import { Inject, Injectable } from '@nestjs/common';
import { IParentRepository, PARENT_REPOSITORY } from '../../domain/repositories/parent.repository.interface';

@Injectable()
export class ListParentsUseCase {
  constructor(@Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository) {}

  execute(tenantId: string) {
    return this.parentRepo.findAll(tenantId);
  }
}
