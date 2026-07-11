import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '../../domain/repositories/sheikh.repository.interface';
import { CreateSheikhDto } from '../dto/create-sheikh.dto';

@Injectable()
export class CreateSheikhUseCase {
  constructor(@Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository) {}

  async execute(tenantId: string, dto: CreateSheikhDto) {
    const existing = await this.sheikhRepo.findByUserId(tenantId, dto.userId);
    if (existing) {
      throw new ConflictException('A sheikh profile already exists for this user in the tenant.');
    }
    return this.sheikhRepo.create({
      tenantId,
      userId: dto.userId,
      qualifications: dto.qualifications,
      yearsOfExperience: dto.yearsOfExperience,
      bio: dto.bio,
    });
  }
}
