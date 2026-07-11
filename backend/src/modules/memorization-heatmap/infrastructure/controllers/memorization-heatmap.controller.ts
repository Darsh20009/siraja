import { Controller, Get, Param, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { GetHeatmapUseCase } from '../../application/use-cases/get-heatmap.use-case';

/** Memorization Heatmap API — `/smart-mushaf/heatmap/students/:studentId` */
@Controller('smart-mushaf/heatmap')
export class MemorizationHeatmapController {
  constructor(private readonly getHeatmap: GetHeatmapUseCase) {}

  @Get('students/:studentId')
  @RequirePermissions(PERMISSIONS.SMART_MUSHAF.READ!)
  get(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Query('surahNumber') surahNumber?: string,
  ) {
    return this.getHeatmap.execute(user, studentId, surahNumber ? Number(surahNumber) : undefined);
  }
}
