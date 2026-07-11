import { Controller, Get, Param, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { GetMistakesOverlayUseCase } from '../../application/use-cases/get-mistakes-overlay.use-case';

/** Ayah Mistakes Overlay API — `/smart-mushaf/mistakes-overlay/students/:studentId` */
@Controller('smart-mushaf/mistakes-overlay')
export class AyahMistakesOverlayController {
  constructor(private readonly getOverlay: GetMistakesOverlayUseCase) {}

  @Get('students/:studentId')
  @RequirePermissions(PERMISSIONS.SMART_MUSHAF.READ!)
  get(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Query('surahNumber') surahNumber?: string,
  ) {
    return this.getOverlay.execute(user, studentId, surahNumber ? Number(surahNumber) : undefined);
  }
}
