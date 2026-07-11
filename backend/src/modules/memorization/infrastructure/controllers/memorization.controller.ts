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
import { CreateMemorizationRecordUseCase } from '../../application/use-cases/create-memorization-record.use-case';
import { ListMemorizationRecordsUseCase } from '../../application/use-cases/list-memorization-records.use-case';
import { GetMemorizationRecordUseCase } from '../../application/use-cases/get-memorization-record.use-case';
import { ApproveMemorizationRecordUseCase } from '../../application/use-cases/approve-memorization-record.use-case';
import { CreateMemorizationRecordDto } from '../../application/dto/create-memorization-record.dto';
import { ApproveMemorizationRecordDto } from '../../application/dto/approve-memorization-record.dto';
import { MemorizationStatus } from '@shared/enums/memorization.enum';

/**
 * Memorization API — `/memorization`
 *
 * RBAC summary:
 *  POST   /memorization               → MEMORIZATION.CREATE  (Sheikh, Tenant Admin)
 *  GET    /memorization               → MEMORIZATION.READ    (role-scoped in use-case)
 *  GET    /memorization/:id           → MEMORIZATION.READ
 *  PATCH  /memorization/:id/approve   → MEMORIZATION.APPROVE (Sheikh, Supervisor, Admin)
 */
@Controller('memorization')
export class MemorizationController {
  constructor(
    private readonly createRecord: CreateMemorizationRecordUseCase,
    private readonly listRecords: ListMemorizationRecordsUseCase,
    private readonly getRecord: GetMemorizationRecordUseCase,
    private readonly approveRecord: ApproveMemorizationRecordUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.MEMORIZATION.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateMemorizationRecordDto) {
    return this.createRecord.execute(user, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.MEMORIZATION.READ!)
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query('studentId') studentId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('status') status?: MemorizationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listRecords.execute(user, {
      studentId,
      sessionId,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
    });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.MEMORIZATION.READ!)
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.getRecord.execute(user, id);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.MEMORIZATION.APPROVE!)
  approve(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: ApproveMemorizationRecordDto,
  ) {
    return this.approveRecord.execute(user, id, dto);
  }
}
