import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UpdateLanguagePreferencesDto } from '../dto/update-language-preferences.dto';

@Injectable()
export class UpdateLanguagePreferencesUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(tenantId: string, userId: string, dto: UpdateLanguagePreferencesDto): Promise<{ message: string }> {
    const user = await this.users.findById(tenantId, userId);
    if (!user) throw new NotFoundException('User not found.');

    await this.users.update(tenantId, userId, {
      preferredLocale: dto.locale,
    });

    return { message: 'Language preferences updated.' };
  }
}
