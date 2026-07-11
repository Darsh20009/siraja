import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
} from '../../application/dto/create-notification-template.dto';
import {
  NOTIFICATION_TEMPLATE_REPOSITORY,
  INotificationTemplateRepository,
} from '../../domain/repositories/notification-template.repository.interface';
import { NotificationChannel, NotificationType } from '@shared/enums/notification.enum';
import { Role } from '@shared/enums/roles.enum';

/**
 * Notification Templates API — `/notification-templates`
 *
 * Template management is restricted to Tenant Admin (tenant-scoped templates)
 * and Super Admin (global templates). Other roles cannot create/update/delete templates.
 *
 * Tenant isolation (IDOR protection):
 *  - Super Admin may create/update/delete global templates (tenantId = null)
 *    AND any tenant-specific template.
 *  - Tenant Admin may only create/update/delete templates scoped to THEIR tenant
 *    (tenantId === user.tenantId). They cannot touch global templates.
 */
@Controller('notification-templates')
export class NotificationTemplatesController {
  constructor(
    @Inject(NOTIFICATION_TEMPLATE_REPOSITORY)
    private readonly templateRepo: INotificationTemplateRepository,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS.CREATE!)
  async create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateNotificationTemplateDto) {
    const roles = user.roles as Role[];
    const isSuperAdmin = roles.includes(Role.SUPER_ADMIN);
    const isAdmin = isSuperAdmin || roles.includes(Role.TENANT_ADMIN);
    if (!isAdmin) throw new ForbiddenException('Only Tenant Admin or Super Admin can create templates.');

    return this.templateRepo.create({
      tenantId: isSuperAdmin ? null : user.tenantId,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      channel: dto.channel,
      titleTemplate: dto.titleTemplate,
      bodyTemplate: dto.bodyTemplate,
      htmlBodyTemplate: dto.htmlBodyTemplate,
      variables: dto.variables,
      createdById: user.sub,
    });
  }

  @Get()
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS.READ!)
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query('type') type?: NotificationType,
    @Query('channel') channel?: NotificationChannel,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templateRepo.findAll(
      user.tenantId,
      type,
      channel,
      page ? Number(page) : 1,
      limit ? Math.min(Number(limit), 100) : 20,
    );
  }

  @Get('resolve')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS.READ!)
  resolve(
    @CurrentUser() user: AccessTokenPayload,
    @Query('type') type: NotificationType,
    @Query('channel') channel: NotificationChannel,
  ) {
    return this.templateRepo.resolve(user.tenantId, type, channel);
  }

  /**
   * GET /notification-templates/:id
   *
   * Tenant isolation:
   *   Super Admin: can read any template (global or any tenant's).
   *   Everyone else: can only read global templates (tenantId = null)
   *     OR templates belonging to their own tenant.
   *   Cross-tenant reads are blocked at both repository and controller layers
   *   (defense in depth).
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS.READ!)
  async getOne(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    const roles = user.roles as Role[];
    const isSuperAdmin = roles.includes(Role.SUPER_ADMIN);

    // Pass null for Super Admin (unrestricted), tenantId for everyone else.
    const template = await this.templateRepo.findById(
      id,
      isSuperAdmin ? null : user.tenantId,
    );
    if (!template) throw new NotFoundException('Template not found.');
    return template;
  }

  /**
   * PATCH /notification-templates/:id
   *
   * Tenant isolation: Tenant Admin may only update templates that belong
   * to their own tenant. Super Admin may update any template (including global).
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS.CREATE!)
  async update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ) {
    await this.assertCanMutateTemplate(user, id);
    return this.templateRepo.update(id, dto);
  }

  /**
   * DELETE /notification-templates/:id
   *
   * Tenant isolation: Tenant Admin may only delete templates that belong
   * to their own tenant. Super Admin may delete any template (including global).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS.DELETE!)
  async delete(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    await this.assertCanMutateTemplate(user, id);
    await this.templateRepo.delete(id);
    return { deleted: true };
  }

  /**
   * Fetch a template and assert the caller has the right to mutate it.
   *
   * Super Admin: may mutate any template (global or tenant-specific).
   * Tenant Admin: may only mutate templates scoped to their own tenant
   *   (tenantId === user.tenantId). Cannot touch global templates (tenantId = null).
   */
  private async assertCanMutateTemplate(user: AccessTokenPayload, id: string): Promise<void> {
    const roles = user.roles as Role[];
    const isSuperAdmin = roles.includes(Role.SUPER_ADMIN);
    const isTenantAdmin = roles.includes(Role.TENANT_ADMIN);

    if (!isSuperAdmin && !isTenantAdmin) {
      throw new ForbiddenException('Only Tenant Admin or Super Admin can modify templates.');
    }

    if (isSuperAdmin) return; // Super Admin: no further checks needed.

    // Tenant Admin: must own the template.
    // Use scoped lookup (tenantId) — defense in depth at the repo layer too.
    const template = await this.templateRepo.findById(id, user.tenantId);
    if (!template) throw new NotFoundException('Template not found.');

    // Global templates (tenantId = null) are owned by the platform, not any tenant.
    if (!template.tenantId) {
      throw new ForbiddenException(
        'Tenant Admin cannot modify global templates. Contact a Super Admin.',
      );
    }

    // Tenant-scoped template must belong to this tenant.
    if (template.tenantId !== user.tenantId) {
      throw new ForbiddenException('Template does not belong to your tenant.');
    }
  }
}
