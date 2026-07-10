import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { SessionManagementUseCase } from '../../application/use-cases/session-management.use-case';
import { AccessTokenPayload } from '../../domain/value-objects/jwt-payload';

/**
 * Session Module HTTP surface — "Active Sessions" list for the
 * authenticated user. Revocation of an individual session is done via
 * `DevicesController#revoke` (revoking the device revokes every
 * refresh token tied to it); there is deliberately no
 * "revoke just this one refresh token" endpoint, since a session and
 * its device are 1:1 for the lifetime of that login.
 */
@Controller('auth/sessions')
export class SessionsController {
  constructor(private readonly sessionManagement: SessionManagementUseCase) {}

  @Get()
  listActiveSessions(@CurrentUser() user: AccessTokenPayload) {
    return this.sessionManagement.listActiveSessions(user.sub);
  }
}
