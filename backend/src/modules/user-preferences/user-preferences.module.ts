import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserPreferences, UserPreferencesSchema } from '@database/mongoose/schemas';
import { USER_PREFERENCES_REPOSITORY } from './domain/repositories/user-preferences.repository.interface';
import { UserPreferencesRepository } from './infrastructure/repositories/user-preferences.repository';
import { UserPreferencesController } from './infrastructure/controllers/user-preferences.controller';

/**
 * UserPreferencesModule — Phase 10.
 *
 * Self-service preferences for every authenticated user.
 * Documents are upserted on first access (no manual create step).
 *
 * Three preference groups:
 *   notifications — enabled channels, muted types, in-app settings
 *   email         — enabled, daily-digest opt-in, digest hour (UTC)
 *   announcements — opt-in/out per scope (global, tenant, circle)
 *
 * Exported for other modules (e.g. NotificationDeliveryService) to check
 * whether a user has opted out before sending.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserPreferences.name, schema: UserPreferencesSchema }]),
  ],
  controllers: [UserPreferencesController],
  providers: [
    { provide: USER_PREFERENCES_REPOSITORY, useClass: UserPreferencesRepository },
  ],
  exports: [USER_PREFERENCES_REPOSITORY],
})
export class UserPreferencesModule {}
