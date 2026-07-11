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
import { CreateAttendanceUseCase } from '../../application/use-cases/create-attendance.use-case';
import { BulkCreateAttendanceUseCase } from '../../application/use-cases/bulk-create-attendance.use-case';
import { ListAttendanceUseCase } from '../../application/use-cases/list-attendance.use-case';
import { GetAttendanceUseCase } from '../../application/use-cases/get-attendance.use-case';
import { UpdateAttendanceUseCase } from '../../application/use-cases/update-attendance.use-case';
import { CreateAttendanceDto } from '../../application/dto/create-attendance.dto';
import { BulkCreateAttendanceDto } from '../../application/dto/bulk-create-attendance.dto';
import { UpdateAttendanceDto } from '../../application/dto/update-attendance.dto';
import { AttendanceStatus } from '@shared/enums/attendance-status.enum';

/**
 * Attendance API — `/attendance`
 *
 * RBAC summary:
 *  POST   /attendance            → ATTENDANCE.CREATE  (Sheikh, Supervisor, Admin)
 *  POST   /attendance/bulk       → ATTENDANCE.CREATE  (Sheikh, Supervisor, Admin)
 *  GET    /attendance            → ATTENDANCE.READ    (role-scoped in use-case)
 *  GET    /attendance/:id        → ATTENDANCE.READ
 *  PATCH  /attendance/:id        → ATTENDANCE.UPDATE  (Sheikh, Supervisor, Admin)
 */
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly createAttendance: CreateAttendanceUseCase,
    private readonly bulkCreate: BulkCreateAttendanceUseCase,
    private readonly listAttendance: ListAttendanceUseCase,
    private readonly getAttendance: GetAttendanceUseCase,
    private readonly updateAttendance: UpdateAttendanceUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ATTENDANCE.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateAttendanceDto) {
    return this.createAttendance.execute(user, dto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.ATTENDANCE.CREATE!)
  bulk(@CurrentUser() user: AccessTokenPayload, @Body() dto: BulkCreateAttendanceDto) {
    return this.bulkCreate.execute(user, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ATTENDANCE.READ!)
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query('sessionId') sessionId?: string,
    @Query('studentId') studentId?: string,
    @Query('groupId') groupId?: string,
    @Query('status') status?: AttendanceStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listAttendance.execute(user, {
      sessionId,
      studentId,
      groupId,
      status,
      fromDate,
      toDate,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
    });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE.READ!)
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.getAttendance.execute(user, id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ATTENDANCE.UPDATE!)
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.updateAttendance.execute(user, id, dto);
  }
}
