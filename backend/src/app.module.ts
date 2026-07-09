import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { validate } from './config/env.validation';

import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { AcademiesModule } from './modules/academies/academies.module';
import { CirclesModule } from './modules/circles/circles.module';
import { SheikhsModule } from './modules/sheikhs/sheikhs.module';
import { StudentsModule } from './modules/students/students.module';
import { ParentsModule } from './modules/parents/parents.module';
import { MemorizationModule } from './modules/memorization/memorization.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';

/**
 * Root application module.
 *
 * Composition root: wires global configuration, the database connection,
 * and every bounded-context module. Each feature module is self-contained
 * (Clean Architecture) and only exposes what it chooses via `exports`.
 *
 * Structure only — modules are currently empty shells (see modules/*).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI,
        dbName: process.env.MONGODB_DB_NAME,
      }),
    }),

    // Bounded-context modules
    AuthModule,
    TenantsModule,
    UsersModule,
    AcademiesModule,
    CirclesModule,
    SheikhsModule,
    StudentsModule,
    ParentsModule,
    MemorizationModule,
    NotificationsModule,
    SubscriptionsModule,
  ],
})
export class AppModule {}
