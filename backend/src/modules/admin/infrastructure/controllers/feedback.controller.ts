import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { FeedbackService } from '../../application/services/feedback.service';
import { SubmitFeedbackDto, ResolveFeedbackDto } from '../../application/dto/submit-feedback.dto';
import { FeedbackStatus, FeedbackType } from '@shared/enums/admin-operations.enum';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  /** Public endpoint — both anonymous and named submissions */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  submit(@Body() dto: SubmitFeedbackDto, @CurrentUser() user?: AccessTokenPayload) {
    return this.service.submit({
      ...dto,
      userId: user?.sub,
      tenantId: user?.tenantId,
    });
  }

  @Get()
  @RequirePermissions(PERMISSIONS.FEEDBACK.READ!)
  list(
    @Query('type') type?: FeedbackType,
    @Query('status') status?: FeedbackStatus,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.service.listFeedback({ type, status, tenantId });
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

  @Patch(':id/resolve')
  @RequirePermissions(PERMISSIONS.FEEDBACK.UPDATE!)
  resolve(@Param('id') id: string, @Body() dto: ResolveFeedbackDto, @CurrentUser() user: AccessTokenPayload) {
    return this.service.resolve(id, user.sub, dto.adminNotes);
  }

  @Patch(':id/close')
  @RequirePermissions(PERMISSIONS.FEEDBACK.UPDATE!)
  close(@Param('id') id: string) {
    return this.service.close(id);
  }
}
