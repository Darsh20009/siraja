import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { FeedbackService } from '../../application/services/feedback.service';
import { SubmitFeedbackDto, ResolveFeedbackDto, ChangeFeedbackStatusDto } from '../../application/dto/submit-feedback.dto';
import { FeedbackStatus, FeedbackType } from '@shared/enums/admin-operations.enum';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  /** Public — anonymous and authenticated submissions */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  submit(@Body() dto: SubmitFeedbackDto, @CurrentUser() user?: AccessTokenPayload) {
    return this.service.submit({
      ...dto,
      userId: user?.sub,
      tenantId: user?.tenantId,
    });
  }

  /** Public — community wall (publicly-flagged feedback only) */
  @Get('public')
  listPublic() {
    return this.service.listPublic();
  }

  @Get()
  @RequirePermissions(PERMISSIONS.FEEDBACK.READ!)
  list(
    @Query('type') type?: FeedbackType,
    @Query('status') status?: FeedbackStatus,
    @Query('tenantId') tenantId?: string,
    @Query('isPublic') isPublic?: string,
  ) {
    return this.service.listFeedback({
      type,
      status,
      tenantId,
      isPublic: isPublic !== undefined ? isPublic === 'true' : undefined,
    });
  }

  @Get('stats')
  @RequirePermissions(PERMISSIONS.FEEDBACK.READ!)
  getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.FEEDBACK.READ!)
  getById(@Param('id') id: string) {
    return this.service.getFeedbackById(id);
  }

  /** Full status workflow — PENDING → UNDER_REVIEW → APPROVED → IN_PROGRESS → COMPLETED */
  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.FEEDBACK.UPDATE!)
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeFeedbackStatusDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.changeStatus(id, dto.status, user.sub, dto.adminNotes);
  }

  /** Toggle public / private visibility */
  @Patch(':id/visibility')
  @RequirePermissions(PERMISSIONS.FEEDBACK.UPDATE!)
  setVisibility(@Param('id') id: string, @Body('isPublic') isPublic: boolean) {
    return this.service.setVisibility(id, isPublic);
  }

  /** @deprecated Use PATCH :id/status instead */
  @Patch(':id/resolve')
  @RequirePermissions(PERMISSIONS.FEEDBACK.UPDATE!)
  resolve(@Param('id') id: string, @Body() dto: ResolveFeedbackDto, @CurrentUser() user: AccessTokenPayload) {
    return this.service.resolve(id, user.sub, dto.adminNotes);
  }

  /** @deprecated Use PATCH :id/status instead */
  @Patch(':id/close')
  @RequirePermissions(PERMISSIONS.FEEDBACK.UPDATE!)
  close(@Param('id') id: string) {
    return this.service.close(id);
  }
}
