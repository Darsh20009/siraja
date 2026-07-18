import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Public } from '@modules/auth/infrastructure/decorators/public.decorator';
import { DonationsService } from '../../application/services/donations.service';
import { CreateCampaignDto } from '../../application/dto/create-campaign.dto';
import { SubmitDonationDto, RejectDonationDto } from '../../application/dto/submit-donation.dto';
import { CampaignStatus } from '@shared/enums/admin-operations.enum';

@Controller('donations')
export class DonationsController {
  constructor(private readonly service: DonationsService) {}

  // ── Public / presentation endpoints ──────────────────────────────────────

  @Public()
  @Get('public')
  getPublicCampaigns() {
    return this.service.getPublicCampaigns();
  }

  @Public()
  @Get('campaigns/:id/public')
  getPublicCampaign(@Param('id') id: string) {
    return this.service.getCampaignById(id);
  }

  @Public()
  @Get('fundraising-progress')
  async getFundraisingProgress() {
    const campaigns = await this.service.getPublicCampaigns();
    const primary = campaigns[0];
    return this.service.getFundraisingProgress(primary?.raisedAmount ?? 0);
  }

  // ── User-facing: submit a donation (optional auth — donor ID captured if logged in) ──

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  submitDonation(@Body() dto: SubmitDonationDto, @CurrentUser() user?: AccessTokenPayload) {
    return this.service.submitDonation({ ...dto, donorUserId: user?.sub });
  }

  // ── Admin: campaign management ────────────────────────────────────────────

  @Get('campaigns')
  @RequirePermissions(PERMISSIONS.DONATIONS.READ!)
  listCampaigns(@Query('status') status?: CampaignStatus) {
    return this.service.listCampaigns(status);
  }

  @Post('campaigns')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.DONATIONS.CREATE!)
  createCampaign(@Body() dto: CreateCampaignDto, @CurrentUser() user: AccessTokenPayload) {
    return this.service.createCampaign(dto as never, user.sub);
  }

  @Patch('campaigns/:id')
  @RequirePermissions(PERMISSIONS.DONATIONS.UPDATE!)
  updateCampaign(@Param('id') id: string, @Body() dto: Partial<CreateCampaignDto>) {
    return this.service.updateCampaign(id, dto as never);
  }

  // ── Admin: donation management ────────────────────────────────────────────

  @Get()
  @RequirePermissions(PERMISSIONS.DONATIONS.READ!)
  listDonations(
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listDonations({ campaignId, status: status as never });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.DONATIONS.READ!)
  getDonation(@Param('id') id: string) {
    return this.service.getDonationById(id);
  }

  @Post(':id/confirm')
  @RequirePermissions(PERMISSIONS.DONATIONS.APPROVE!)
  confirmDonation(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.service.confirmDonation(id, user.sub);
  }

  @Post(':id/reject')
  @RequirePermissions(PERMISSIONS.DONATIONS.APPROVE!)
  rejectDonation(@Param('id') id: string, @Body() dto: RejectDonationDto) {
    return this.service.rejectDonation(id, dto.rejectionReason);
  }
}
