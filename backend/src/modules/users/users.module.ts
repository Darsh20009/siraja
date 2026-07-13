import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema, UserPreferences, UserPreferencesSchema } from '@database/mongoose/schemas';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { GetMeUseCase } from './application/use-cases/get-me.use-case';
import { UpdateMeUseCase } from './application/use-cases/update-me.use-case';
import { UpdateLanguagePreferencesUseCase } from './application/use-cases/update-language-preferences.use-case';
import { UpdateNotificationPreferencesUseCase } from './application/use-cases/update-notification-preferences.use-case';
import { UsersController } from './infrastructure/controllers/users.controller';

/**
 * Users Module — Phase 12A
 *
 * Provides:
 *  GET  /users/me                 — full profile + preferences
 *  PATCH /users/me                — update profile
 *  PATCH /users/me/language       — update locale
 *  PATCH /users/me/notifications  — update notification prefs
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserPreferences.name, schema: UserPreferencesSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [
    { provide: USER_REPOSITORY, useClass: UserRepository },
    GetMeUseCase,
    UpdateMeUseCase,
    UpdateLanguagePreferencesUseCase,
    UpdateNotificationPreferencesUseCase,
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
