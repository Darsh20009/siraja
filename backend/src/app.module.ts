import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { validate } from './config/env.validation';

import { TenantMiddleware } from './core/infrastructure/tenancy/tenant.middleware';
import { PermissionContextMiddleware } from './core/infrastructure/authorization/permission-context.middleware';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { AcademiesModule } from './modules/academies/academies.module';
import { CirclesModule } from './modules/circles/circles.module';
import { SheikhsModule } from './modules/sheikhs/sheikhs.module';
import { StudentsModule } from './modules/students/students.module';
import { ParentsModule } from './modules/parents/parents.module';
import { SupervisorsModule } from './modules/supervisors/supervisors.module';
import { StudentAssignmentsModule } from './modules/student-assignments/student-assignments.module';
import { MemorizationModule } from './modules/memorization/memorization.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SurahsModule } from './modules/surahs/surahs.module';
import { AyahsModule } from './modules/ayahs/ayahs.module';
import { QuranMetadataModule } from './modules/quran-metadata/quran-metadata.module';
import { TafsirModule } from './modules/tafsir/tafsir.module';
import { QuranSearchModule } from './modules/quran-search/quran-search.module';
import { QuranBookmarksModule } from './modules/quran-bookmarks/quran-bookmarks.module';
import { QuranNotesModule } from './modules/quran-notes/quran-notes.module';

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

    // Global IP-based rate limiting (Phase 4 "Rate Limiting" requirement)
    // — auth-specific brute-force/lockout logic (BruteForceGuardService)
    // is a second, identity-aware layer on top of this generic one.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('throttle.ttl', 60) * 1000,
          limit: configService.get<number>('throttle.limit', 100),
        },
      ],
    }),

    // Cross-cutting infrastructure — registers global guards (JwtAuthGuard,
    // RolesGuard, PermissionsGuard, TenantScopeGuard, ResourceOwnershipGuard).
    AuthorizationModule,

    // Bounded-context modules
    AuthModule,
    TenantsModule,
    UsersModule,
    AcademiesModule,
    CirclesModule,
    SheikhsModule,
    StudentsModule,
    ParentsModule,
    SupervisorsModule,
    StudentAssignmentsModule,
    MemorizationModule,
    NotificationsModule,
    SubscriptionsModule,

    // Quran Foundation Engine (Phase 5)
    SurahsModule,
    AyahsModule,
    QuranMetadataModule,
    TafsirModule,
    QuranSearchModule,
    QuranBookmarksModule,
    QuranNotesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Order matters: resolve the tenant from the URL before initializing
    // the per-request authorization state.
    consumer.apply(TenantMiddleware, PermissionContextMiddleware).forRoutes('*');
  }
}
