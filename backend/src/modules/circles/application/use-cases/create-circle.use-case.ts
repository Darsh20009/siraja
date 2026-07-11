import { Inject, Injectable } from '@nestjs/common';
import { ICircleRepository, CIRCLE_REPOSITORY } from '../../domain/repositories/circle.repository.interface';
import { CreateCircleDto } from '../dto/create-circle.dto';

@Injectable()
export class CreateCircleUseCase {
  constructor(@Inject(CIRCLE_REPOSITORY) private readonly circleRepo: ICircleRepository) {}

  execute(tenantId: string, dto: CreateCircleDto) {
    return this.circleRepo.create({
      tenantId,
      name: dto.name,
      description: dto.description,
      capacity: dto.capacity,
      targetJuzStart: dto.targetJuzStart,
      targetJuzEnd: dto.targetJuzEnd,
      schedule: dto.schedule,
    });
  }
}
