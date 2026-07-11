import { Controller, Get, Param } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { GetSmartMushafViewUseCase } from '../../application/use-cases/get-smart-mushaf-view.use-case';

/**
 * Smart Mushaf facade API — `/smart-mushaf/students/:studentId/surahs/:surahNumber`
 * Merges ayah text, per-ayah performance/heatmap, teacher notes, and the
 * mistakes overlay into one payload for the Mushaf reading screen.
 */
@Controller('smart-mushaf/students/:studentId/surahs/:surahNumber')
export class SmartMushafController {
  constructor(private readonly getView: GetSmartMushafViewUseCase) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SMART_MUSHAF.READ!)
  get(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Param('surahNumber') surahNumber: string,
  ) {
    return this.getView.execute(user, studentId, Number(surahNumber));
  }
}
