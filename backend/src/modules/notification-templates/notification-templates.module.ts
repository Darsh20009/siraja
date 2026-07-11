import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationTemplate, NotificationTemplateSchema } from '@database/mongoose/schemas';
import { NOTIFICATION_TEMPLATE_REPOSITORY } from './domain/repositories/notification-template.repository.interface';
import { NotificationTemplateRepository } from './infrastructure/repositories/notification-template.repository';
import { NotificationTemplatesController } from './infrastructure/controllers/notification-templates.controller';

/**
 * NotificationTemplatesModule — Phase 10.
 *
 * Reusable content templates (titleTemplate, bodyTemplate, htmlBodyTemplate)
 * for notification dispatch. Templates are global (null tenantId) or
 * tenant-specific; tenant-specific templates override globals for the same
 * type+channel combination. Variable substitution ({{key}}) is performed
 * at render time via INotificationTemplateRepository.render().
 *
 * Exports NOTIFICATION_TEMPLATE_REPOSITORY for other modules to resolve
 * and render templates without importing the whole module.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
    ]),
  ],
  controllers: [NotificationTemplatesController],
  providers: [
    { provide: NOTIFICATION_TEMPLATE_REPOSITORY, useClass: NotificationTemplateRepository },
  ],
  exports: [NOTIFICATION_TEMPLATE_REPOSITORY],
})
export class NotificationTemplatesModule {}
