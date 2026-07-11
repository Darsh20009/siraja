import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { LogMistakeUseCase } from '../../application/use-cases/log-mistake.use-case';
import { ListMistakesUseCase } from '../../application/use-cases/list-mistakes.use-case';
import { ResolveMistakeUseCase } from '../../application/use-cases/resolve-mistake.use-case';
import { GetMistakeFrequencyUseCase } from '../../application/use-cases/get-mistake-frequency.use-case';
import { LogMistakeDto } from '../../application/dto/log-mistake.dto';
import { MistakeResolutionStatus, MistakeSeverity, MistakeType } from '@shared/enums/memorization.enum';

/**
 * Mistakes API — `/mistakes`
 *
 * RBAC summary:
 *  POST   /mistakes                              → MEMORIZATION.CREATE  (Sheikh, Admin)
 *  GET    /mistakes                              → MEMORIZATION.READ    (role-scoped)
 *  GET    /mistakes/students/:studentId/frequency → MEMORIZATION.READ
 *  PATCH  /mistakes/:id/resolve                   → MEMORIZATION.UPDATE (Sheikh, Supervisor, Admin)
 */
@Controller('mistakes')
export class MistakesController {
  constructor(
    private readonly logMistake: LogMistakeUseCase,
    private readonly listMistakes: ListMistakesUseCase,
    private readonly resolveMistake: ResolveMistakeUseCase,
    private readonly getMistakeFrequency: GetMistakeFrequencyUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.MEMORIZATION.CREATE!)
  log(@CurrentUser() user: AccessTokenPayload, @Body() dto: LogMistakeDto) {
    return this.logMistake.execute(user, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.MEMORIZATION.READ!)
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query('studentId') studentId?: string,
    @Query('memorizationRecordId') memorizationRecordId?: string,
    @Query('reviewRecordId') reviewRecordId?: string,
    @Query('type') type?: MistakeType,
    @Query('severity') severity?: MistakeSeverity,
    @Query('resolutionStatus') resolutionStatus?: MistakeResolutionStatus,
    @Query('surahNumber') surahNumber?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listMistakes.execute(user, {
      studentId,
      memorizationRecordId,
      reviewRecordId,
      type,
      severity,
      resolutionStatus,
      surahNumber: surahNumber ? Number(surahNumber) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 50,
    });
  }

  @Get('students/:studentId/frequency')
  @RequirePermissions(PERMISSIONS.MEMORIZATION.READ!)
  frequency(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
    @Query('surahNumber') surahNumber?: string,
  ) {
    return this.getMistakeFrequency.execute(user, studentId, surahNumber ? Number(surahNumber) : undefined);
  }

  @Patch(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.MEMORIZATION.APPROVE!)
  resolve(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.resolveMistake.execute(user, id);
  }
}
