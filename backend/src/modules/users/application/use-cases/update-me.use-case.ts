import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class UpdateMeUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(tenantId: string, userId: string, dto: UpdateProfileDto): Promise<{ message: string }> {
    const user = await this.users.findById(tenantId, userId);
    if (!user) throw new NotFoundException('User not found.');

    await this.users.update(tenantId, userId, {
      fullName: dto.fullName,
      avatarUrl: dto.avatarUrl,
      gender: dto.gender,
    });

    return { message: 'Profile updated successfully.' };
  }
}
