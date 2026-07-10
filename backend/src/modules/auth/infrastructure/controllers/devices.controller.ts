import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../decorators/current-user.decorator';
import { extractRequestContext } from '../helpers/request-context.helper';
import { RevokeDeviceParamDto } from '../../application/dto/revoke-device.dto';
import { SessionManagementUseCase } from '../../application/use-cases/session-management.use-case';
import { AccessTokenPayload } from '../../domain/value-objects/jwt-payload';

/** Device Module HTTP surface — device tracking + device-level revocation. */
@Controller('auth/devices')
export class DevicesController {
  constructor(private readonly sessionManagement: SessionManagementUseCase) {}

  @Get()
  listDevices(@CurrentUser() user: AccessTokenPayload) {
    return this.sessionManagement.listDevices(user.sub);
  }

  @Delete(':deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@Param() params: RevokeDeviceParamDto, @CurrentUser() user: AccessTokenPayload, @Req() req: Request) {
    const { ipAddress } = extractRequestContext(req);
    return this.sessionManagement.revokeDevice(user.sub, user.tenantId, params.deviceId, ipAddress);
  }
}
