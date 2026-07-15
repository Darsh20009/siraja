import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { SystemAlertsService } from '../../application/services/system-alerts.service';
import { AlertStatus, AlertType, AlertSeverity } from '@shared/enums/admin-operations.enum';

class ResolveAlertDto {
  @IsString() @IsOptional() resolutionNote?: string;
}

@Controller('admin/alerts')
export class SystemAlertsController {
  constructor(private readonly service: SystemAlertsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  listAlerts(
    @Query('status') status?: AlertStatus,
    @Query('type') type?: AlertType,
    @Query('severity') severity?: AlertSeverity,
  ) {
    return this.service.listAlerts({ status, type, severity });
  }

  @Get('active')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getActive() {
    return this.service.getActiveAlerts();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ADMIN.READ!)
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id/acknowledge')
  @RequirePermissions(PERMISSIONS.ADMIN.UPDATE!)
  acknowledge(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.service.acknowledge(id, user.sub);
  }

  @Patch(':id/resolve')
  @RequirePermissions(PERMISSIONS.ADMIN.RESOLVE!)
  resolve(@Param('id') id: string, @Body() dto: ResolveAlertDto, @CurrentUser() user: AccessTokenPayload) {
    return this.service.resolve(id, user.sub, dto.resolutionNote);
  }
}
