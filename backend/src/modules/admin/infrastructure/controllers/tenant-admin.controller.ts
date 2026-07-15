import { Body, Controller, Get, Patch } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { TenantAdminService } from '../../application/services/tenant-admin.service';
import { UpsertBrandingDto } from '../../application/dto/upsert-branding.dto';
import { AuditAdminService } from '../../application/services/audit-admin.service';
import { AuditAction, AuditEntityType } from '@shared/enums/audit.enum';

@Controller('admin/tenants')
export class TenantAdminController {
  constructor(
    private readonly tenantAdmin: TenantAdminService,
    private readonly audit: AuditAdminService,
  ) {}

  @Get('branding')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getBranding(@CurrentUser() user: AccessTokenPayload) {
    return this.tenantAdmin.getBranding(user.tenantId);
  }

  @Patch('branding')
  @RequirePermissions(PERMISSIONS.ADMIN.UPDATE!)
  async upsertBranding(@Body() dto: UpsertBrandingDto, @CurrentUser() user: AccessTokenPayload) {
    const result = await this.tenantAdmin.upsertBranding(user.tenantId, dto as never);
    await this.audit.record({
      actorId: user.sub,
      tenantId: user.tenantId,
      action: AuditAction.TENANT_CHANGE,
      entityType: AuditEntityType.TENANT,
      entityId: user.tenantId,
      notes: 'Branding updated',
    });
    return result;
  }
}
