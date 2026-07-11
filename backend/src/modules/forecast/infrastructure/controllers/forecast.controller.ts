import { Controller, Get, Param } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { GetCompletionForecastUseCase } from '../../application/use-cases/get-completion-forecast.use-case';

/**
 * Forecast API — `/forecast`
 *
 * RBAC summary:
 *  GET /forecast/me                     → MEMORIZATION.READ (student's own forecast)
 *  GET /forecast/students/:studentId    → REPORTS.READ      (sheikh / supervisor / admin)
 */
@Controller('forecast')
export class ForecastController {
  constructor(private readonly getForecast: GetCompletionForecastUseCase) {}

  @Get('me')
  @RequirePermissions(PERMISSIONS.MEMORIZATION.READ!)
  getMyForecast(@CurrentUser() user: AccessTokenPayload) {
    return this.getForecast.execute(user, user.sub);
  }

  @Get('students/:studentId')
  @RequirePermissions(PERMISSIONS.MEMORIZATION.READ!)
  getStudentForecast(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.getForecast.execute(user, studentId);
  }
}
