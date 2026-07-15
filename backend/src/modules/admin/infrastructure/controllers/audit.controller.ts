import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { AuditAdminService } from '../../application/services/audit-admin.service';
import { AuditAction, AuditEntityType } from '@shared/enums/audit.enum';

@Controller('admin/audit')
export class AuditController {
  constructor(private readonly service: AuditAdminService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT.READ!)
  listLogs(
    @Query('actorId') actorId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('action') action?: AuditAction,
    @Query('entityType') entityType?: AuditEntityType,
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.service.listLogs(
      { actorId, tenantId, action, entityType, fromDate, toDate },
      limit ? parseInt(limit, 10) : 50,
      page ? parseInt(page, 10) : 1,
    );
  }

  @Get('count')
  @RequirePermissions(PERMISSIONS.AUDIT.READ!)
  count(@Query('tenantId') tenantId?: string, @Query('action') action?: AuditAction) {
    return this.service.getCount({ tenantId, action });
  }
}
