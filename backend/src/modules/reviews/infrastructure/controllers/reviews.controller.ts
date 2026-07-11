import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { CreateReviewRecordUseCase } from '../../application/use-cases/create-review-record.use-case';
import { ListReviewRecordsUseCase } from '../../application/use-cases/list-review-records.use-case';
import { GetReviewRecordUseCase } from '../../application/use-cases/get-review-record.use-case';
import { GetReviewPerformanceUseCase } from '../../application/use-cases/get-review-performance.use-case';
import { CreateReviewRecordDto } from '../../application/dto/create-review-record.dto';

/**
 * Reviews (Revision) API — `/reviews`
 *
 * RBAC summary:
 *  POST   /reviews                              → REVIEWS.CREATE  (Sheikh, Tenant Admin)
 *  GET    /reviews                              → REVIEWS.READ    (role-scoped in use-case)
 *  GET    /reviews/:id                          → REVIEWS.READ
 *  GET    /reviews/students/:studentId/performance → REVIEWS.READ
 */
@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly createRecord: CreateReviewRecordUseCase,
    private readonly listRecords: ListReviewRecordsUseCase,
    private readonly getRecord: GetReviewRecordUseCase,
    private readonly getPerformance: GetReviewPerformanceUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.REVIEWS.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateReviewRecordDto) {
    return this.createRecord.execute(user, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.REVIEWS.READ!)
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query('studentId') studentId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listRecords.execute(user, {
      studentId,
      sessionId,
      fromDate,
      toDate,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
    });
  }

  @Get('students/:studentId/performance')
  @RequirePermissions(PERMISSIONS.REVIEWS.READ!)
  getPerformanceSummary(
    @CurrentUser() user: AccessTokenPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.getPerformance.execute(user, studentId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.REVIEWS.READ!)
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.getRecord.execute(user, id);
  }
}
