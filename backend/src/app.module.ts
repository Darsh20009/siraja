import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { validate } from './config/env.validation';

import { TenantMiddleware } from './core/infrastructure/tenancy/tenant.middleware';
import { PermissionContextMiddleware } from './core/infrastructure/authorization/permission-context.middleware';
import { HealthController } from './core/infrastructure/health/health.controller';
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
import { ReviewsModule } from './modules/reviews/reviews.module';
import { MistakesModule } from './modules/mistakes/mistakes.module';
import { ProgressModule } from './modules/progress/progress.module';
import { ForecastModule } from './modules/forecast/forecast.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ExamsModule } from './modules/exams/exams.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SurahsModule } from './modules/surahs/surahs.module';
import { AyahsModule } from './modules/ayahs/ayahs.module';
import { QuranMetadataModule } from './modules/quran-metadata/quran-metadata.module';
import { TafsirModule } from './modules/tafsir/tafsir.module';
import { QuranSearchModule } from './modules/quran-search/quran-search.module';
import { QuranBookmarksModule } from './modules/quran-bookmarks/quran-bookmarks.module';
import { QuranNotesModule } from './modules/quran-notes/quran-notes.module';

// Smart Mushaf Engine (Phase 9)
import { AyahPerformanceModule } from './modules/ayah-performance/ayah-performance.module';
import { AyahNotesModule } from './modules/ayah-notes/ayah-notes.module';
import { AyahMistakesOverlayModule } from './modules/ayah-mistakes-overlay/ayah-mistakes-overlay.module';
import { MemorizationHeatmapModule } from './modules/memorization-heatmap/memorization-heatmap.module';
import { SmartMushafModule } from './modules/smart-mushaf/smart-mushaf.module';

// Communication & Notification Platform (Phase 10)
import { EmailModule } from './shared/email/email.module';
import { NotificationTemplatesModule } from './modules/notification-templates/notification-templates.module';
import { InAppMessagingModule } from './modules/in-app-messaging/in-app-messaging.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { UserPreferencesModule } from './modules/user-preferences/user-preferences.module';

// AI Learning Intelligence Architecture (Phase 11)
import { AiProviderModule } from './shared/ai/ai-provider.module';
import { AiModule } from './modules/ai/ai.module';

// Platform Foundation (Phase 12A)
import { StorageModule } from './shared/storage/storage.module';

// Infrastructure, Reliability & Production Readiness (Phase 12C)
import { RedisModule } from './shared/redis/redis.module';
import { QueuesModule } from './shared/queues/queues.module';
import { EventsModule } from './shared/events/events.module';
import { SystemModule } from './modules/system/system.module';

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
    ReviewsModule,
    MistakesModule,
    ProgressModule,
    ForecastModule,

    // Attendance, Exams, Assignments & Reporting Engine (Phase 8)
    AttendanceModule,
    ExamsModule,
    AssignmentsModule,
    AssessmentsModule,
    ReportingModule,

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

    // Smart Mushaf Engine (Phase 9)
    AyahPerformanceModule,
    AyahNotesModule,
    AyahMistakesOverlayModule,
    MemorizationHeatmapModule,
    SmartMushafModule,

    // Communication & Notification Platform (Phase 10)
    EmailModule,
    NotificationTemplatesModule,
    InAppMessagingModule,
    AnnouncementsModule,
    UserPreferencesModule,

    // AI Learning Intelligence Architecture (Phase 11)
    AiProviderModule,
    AiModule,

    // Platform Foundation (Phase 12A)
    StorageModule,

    // Infrastructure, Reliability & Production Readiness (Phase 12C)
    RedisModule,
    QueuesModule.forRootAsync(),
    EventsModule,
    SystemModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, TenantMiddleware, PermissionContextMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Order matters: resolve the tenant (from the X-Tenant-Slug header —
    // see tenant.middleware.ts) before initializing the per-request
    // authorization state.
    consumer.apply(TenantMiddleware, PermissionContextMiddleware).forRoutes('*');
  }
}
