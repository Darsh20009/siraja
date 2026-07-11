import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { GetAyahPerformanceUseCase } from '../../application/use-cases/get-ayah-performance.use-case';
import { ListAyahPerformanceUseCase } from '../../application/use-cases/list-ayah-performance.use-case';
import { UpdateAyahPerformanceUseCase } from '../../application/use-cases/update-ayah-performance.use-case';
import { UpdateAyahPerformanceDto } from '../../application/dto/update-ayah-performance.dto';
import { HeatmapLevel } from '@shared/enums/smart-mushaf.enum';

/**
 * Ayah Performance API — `/smart-mushaf/performance`
 *
 * RBAC summary:
 *  GET   /smart-mushaf/performance/students/:studentId                         → SMART_MUSHAF.READ (role-scoped)
 *  GET   /smart-mushaf/performance/students/:studentId/:surahNumber/:ayahNumber → SMART_MUSHAF.READ
 *  PATCH /smart-mushaf/performance/students/:studentId/:surahNumber/:ayahNumber → SMART_MUSHAF.UPDATE (Sheikh, Admin)
 */
@Controller('smart-mushaf/performance')
export class AyahPerformanceController {
  constructor(
    private readonly getPerformance: GetAyahPerformanceUseCase,
    private readonly listPerformance: ListAyahPerformanceUseCase,
    private readonly updatePerformance: UpdateAyahPerformanceUseCase,
  ) {}

  @Get('students/:studentId')
  @RequirePermissions(PERMISSIONS.SMART_MUSHAF.READ!)
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Query('surahNumber') surahNumber?: string,
    @Query('heatmapLevel') heatmapLevel?: HeatmapLevel,
  ) {
    return this.listPerformance.execute(user, studentId, {
      surahNumber: surahNumber ? Number(surahNumber) : undefined,
      heatmapLevel,
    });
  }

  @Get('students/:studentId/:surahNumber/:ayahNumber')
  @RequirePermissions(PERMISSIONS.SMART_MUSHAF.READ!)
  getOne(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Param('surahNumber') surahNumber: string,
    @Param('ayahNumber') ayahNumber: string,
  ) {
    return this.getPerformance.execute(user, studentId, Number(surahNumber), Number(ayahNumber));
  }

  @Patch('students/:studentId/:surahNumber/:ayahNumber')
  @RequirePermissions(PERMISSIONS.SMART_MUSHAF.UPDATE!)
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Param('surahNumber') surahNumber: string,
    @Param('ayahNumber') ayahNumber: string,
    @Body() dto: UpdateAyahPerformanceDto,
  ) {
    return this.updatePerformance.execute(user, studentId, Number(surahNumber), Number(ayahNumber), dto);
  }
}
