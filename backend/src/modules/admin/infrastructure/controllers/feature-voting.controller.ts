import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { FeatureVotingService } from '../../application/services/feature-voting.service';
import { SuggestFeatureDto, ReviewFeatureDto, SetFeaturePriorityDto } from '../../application/dto/feature-request.dto';
import { FeatureRequestStatus } from '@shared/enums/admin-operations.enum';

@Controller('feature-requests')
export class FeatureVotingController {
  constructor(private readonly service: FeatureVotingService) {}

  @Get()
  list(@Query('status') status?: FeatureRequestStatus) {
    return this.service.listFeatureRequests(status);
  }

  @Get('top')
  getTopVoted(@Query('limit') limit?: string) {
    return this.service.getTopVoted(limit ? parseInt(limit, 10) : 20);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  suggest(@Body() dto: SuggestFeatureDto, @CurrentUser() user?: AccessTokenPayload) {
    return this.service.suggest({ ...dto, submittedBy: user?.sub, tenantId: user?.tenantId });
  }

  // ── Voting ────────────────────────────────────────────────────────────────

  @Post(':id/vote')
  @HttpCode(HttpStatus.OK)
  vote(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.service.vote(id, user.sub, user.tenantId);
  }

  @Delete(':id/vote')
  @HttpCode(HttpStatus.OK)
  unvote(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.service.unvote(id, user.sub);
  }

  // ── Following ─────────────────────────────────────────────────────────────

  @Post(':id/follow')
  @HttpCode(HttpStatus.OK)
  follow(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.service.follow(id, user.sub, user.tenantId);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.OK)
  unfollow(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.service.unfollow(id, user.sub);
  }

  @Get(':id/follow-status')
  getFollowStatus(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.service.getFollowStatus(id, user.sub);
  }

  // ── Admin actions ─────────────────────────────────────────────────────────

  @Patch(':id/review')
  @RequirePermissions(PERMISSIONS.FEATURE_VOTING.APPROVE!)
  reviewFeature(
    @Param('id') id: string,
    @Body() dto: ReviewFeatureDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.changeStatus(id, dto.status, user.sub, dto.adminResponse, dto.rejectionReason);
  }

  @Patch(':id/priority')
  @RequirePermissions(PERMISSIONS.FEATURE_VOTING.UPDATE!)
  setPriority(@Param('id') id: string, @Body() dto: SetFeaturePriorityDto) {
    return this.service.setPriority(id, dto.priority);
  }

  /** Merge source (duplicate) into target — transfers votes and deletes the source. */
  @Post(':id/merge/:targetId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.FEATURE_VOTING.APPROVE!)
  mergeFeatures(
    @Param('id') sourceId: string,
    @Param('targetId') targetId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.mergeFeatures(sourceId, targetId, user.sub);
  }
}
