import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Announcement, AnnouncementSchema } from '@database/mongoose/schemas';
import { ANNOUNCEMENT_REPOSITORY } from './domain/repositories/announcement.repository.interface';
import { AnnouncementRepository } from './infrastructure/repositories/announcement.repository';
import { AnnouncementsController } from './infrastructure/controllers/announcements.controller';
import { CreateAnnouncementUseCase } from './application/use-cases/create-announcement.use-case';
import { ListAnnouncementsUseCase } from './application/use-cases/list-announcements.use-case';

/**
 * AnnouncementsModule — Phase 10.
 *
 * Three scopes:
 *   GLOBAL  → all tenants (Super Admin only)
 *   TENANT  → all users in one tenant (Tenant Admin)
 *   CIRCLE  → circle members only (Sheikh / Supervisor)
 *
 * Lifecycle: DRAFT → PUBLISHED → ARCHIVED.
 * Audience view automatically filters to PUBLISHED + not-expired.
 * Management view (manage=true query param) returns all statuses for admins.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Announcement.name, schema: AnnouncementSchema }]),
  ],
  controllers: [AnnouncementsController],
  providers: [
    { provide: ANNOUNCEMENT_REPOSITORY, useClass: AnnouncementRepository },
    CreateAnnouncementUseCase,
    ListAnnouncementsUseCase,
  ],
  exports: [ANNOUNCEMENT_REPOSITORY],
})
export class AnnouncementsModule {}
