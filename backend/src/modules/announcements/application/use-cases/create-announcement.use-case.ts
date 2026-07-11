import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  ANNOUNCEMENT_REPOSITORY,
  IAnnouncementRepository,
} from '../../domain/repositories/announcement.repository.interface';
import { CreateAnnouncementDto } from '../dto/announcement.dto';
import { Role } from '@shared/enums/roles.enum';
import { AnnouncementScope } from '@shared/enums/announcement.enum';
import { NotificationPriority } from '@shared/enums/notification.enum';

/**
 * CreateAnnouncementUseCase
 *
 * Scope enforcement:
 *   GLOBAL  → Super Admin only
 *   TENANT  → Tenant Admin only
 *   CIRCLE  → Sheikh or Supervisor (plus Tenant Admin)
 */
@Injectable()
export class CreateAnnouncementUseCase {
  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY)
    private readonly repo: IAnnouncementRepository,
  ) {}

  async execute(user: AccessTokenPayload, dto: CreateAnnouncementDto) {
    const roles = user.roles as Role[];
    const isSuperAdmin = roles.includes(Role.SUPER_ADMIN);
    const isTenantAdmin = roles.includes(Role.TENANT_ADMIN);
    const isSheikh = roles.includes(Role.SHEIKH);
    const isSupervisor = roles.includes(Role.SUPERVISOR);

    this.assertScopeAllowed(dto.scope, { isSuperAdmin, isTenantAdmin, isSheikh, isSupervisor });

    if (dto.scope === AnnouncementScope.CIRCLE && !dto.circleId) {
      throw new ForbiddenException('circleId is required for CIRCLE-scoped announcements.');
    }

    return this.repo.create({
      tenantId: user.tenantId,
      scope: dto.scope,
      scopedTenantId: dto.scope === AnnouncementScope.GLOBAL ? null : user.tenantId,
      circleId: dto.circleId,
      title: dto.title,
      body: dto.body,
      htmlBody: dto.htmlBody,
      priority: dto.priority ?? NotificationPriority.NORMAL,
      createdById: user.sub,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      deepLink: dto.deepLink,
    });
  }

  private assertScopeAllowed(
    scope: AnnouncementScope,
    ctx: {
      isSuperAdmin: boolean;
      isTenantAdmin: boolean;
      isSheikh: boolean;
      isSupervisor: boolean;
    },
  ) {
    switch (scope) {
      case AnnouncementScope.GLOBAL:
        if (!ctx.isSuperAdmin) throw new ForbiddenException('Only Super Admin can create global announcements.');
        break;
      case AnnouncementScope.TENANT:
        if (!ctx.isTenantAdmin && !ctx.isSuperAdmin)
          throw new ForbiddenException('Only Tenant Admin can create tenant-wide announcements.');
        break;
      case AnnouncementScope.CIRCLE:
        if (!ctx.isSheikh && !ctx.isSupervisor && !ctx.isTenantAdmin && !ctx.isSuperAdmin)
          throw new ForbiddenException('Only Sheikh, Supervisor, or Admin can create circle announcements.');
        break;
    }
  }
}
