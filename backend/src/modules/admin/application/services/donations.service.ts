import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '@shared/events/events.constants';
import { DONATION_CAMPAIGN_REPOSITORY, IDonationCampaignRepository } from '../../domain/repositories/donation-campaign.repository.interface';
import { DONATION_REPOSITORY, IDonationRepository } from '../../domain/repositories/donation.repository.interface';
import { DonationStatus, CampaignStatus } from '@shared/enums/admin-operations.enum';
import { DonationCampaignDocument, FundraisingStage } from '@database/mongoose/schemas/donation-campaign.schema';

/** Fundraising stages hardcoded per requirements — overridden by campaign stages if set. */
export const DEFAULT_STAGES: FundraisingStage[] = [
  { stageNumber: 1, label: 'المرحلة الأولى',  targetAmount: 5000  },
  { stageNumber: 2, label: 'المرحلة الثانية', targetAmount: 15000 },
  { stageNumber: 3, label: 'المرحلة الثالثة', targetAmount: 30000 },
  { stageNumber: 4, label: 'المرحلة الرابعة', targetAmount: 50000 },
  { stageNumber: 5, label: 'المرحلة الخامسة', targetAmount: 100000 },
  { stageNumber: 6, label: 'المرحلة السادسة', targetAmount: 150000 },
];

@Injectable()
export class DonationsService {
  constructor(
    @Inject(DONATION_CAMPAIGN_REPOSITORY) private readonly campaignRepo: IDonationCampaignRepository,
    @Inject(DONATION_REPOSITORY) private readonly donationRepo: IDonationRepository,
    private readonly emitter: EventEmitter2,
  ) {}

  // ── Campaigns ─────────────────────────────────────────────────────────────

  listCampaigns(status?: CampaignStatus) {
    return this.campaignRepo.findAll(status ? { status } : undefined);
  }

  getPublicCampaigns() {
    return this.campaignRepo.findPublicActive();
  }

  async getCampaignById(id: string) {
    const campaign = await this.campaignRepo.findById(id);
    if (!campaign) throw new NotFoundException('Campaign not found');
    const [donorCount, raisedAmount] = await Promise.all([
      this.donationRepo.countByCampaign(id),
      this.donationRepo.sumConfirmedByCampaign(id),
    ]);
    const stages = (campaign.stages?.length ? campaign.stages : DEFAULT_STAGES).map(stage => ({
      ...stage,
      completed: raisedAmount >= stage.targetAmount,
      completedAt: stage.completedAt,
    }));
    const campaignDoc = campaign as DonationCampaignDocument;
    const campaignObj = typeof campaignDoc.toObject === 'function' ? campaignDoc.toObject() : campaign;
    return { ...campaignObj, donorCount, raisedAmount, stages };
  }

  async createCampaign(data: Record<string, unknown>, createdBy: string) {
    return this.campaignRepo.create({
      ...data,
      stages: (data.stages as []) ?? DEFAULT_STAGES,
      createdBy: createdBy as never,
    } as never);
  }

  async updateCampaign(id: string, data: Record<string, unknown>) {
    const campaign = await this.campaignRepo.update(id, data as never);
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  // ── Donations ─────────────────────────────────────────────────────────────

  listDonations(filter?: { campaignId?: string; status?: DonationStatus }) {
    return this.donationRepo.findAll(filter);
  }

  async getDonationById(id: string) {
    const donation = await this.donationRepo.findById(id);
    if (!donation) throw new NotFoundException('Donation not found');
    return donation;
  }

  async submitDonation(data: {
    campaignId: string;
    amount: number;
    method?: string;
    isAnonymous?: boolean;
    donorName?: string;
    donorPhone?: string;
    donorEmail?: string;
    donorUserId?: string;
    note?: string;
  }) {
    const campaign = await this.campaignRepo.findById(data.campaignId);
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== CampaignStatus.ACTIVE) throw new BadRequestException('Campaign is not active');

    const donation = await this.donationRepo.create({
      campaignId: data.campaignId as never,
      donorUserId: data.donorUserId as never,
      amount: data.amount,
      method: data.method as never,
      status: DonationStatus.PENDING,
      isAnonymous: data.isAnonymous ?? !data.donorUserId,
      donorName: data.donorName,
      donorPhone: data.donorPhone,
      donorEmail: data.donorEmail,
      note: data.note,
    });

    this.emitter.emit(EVENTS.DONATION_CREATED, { donationId: String((donation as unknown as { _id: Types.ObjectId })._id), campaignId: data.campaignId, amount: data.amount });
    return donation;
  }

  async confirmDonation(id: string, confirmedBy: string) {
    const donation = await this.donationRepo.findById(id);
    if (!donation) throw new NotFoundException('Donation not found');
    if (donation.status !== DonationStatus.PENDING) throw new BadRequestException('Only pending donations can be confirmed');

    const updated = await this.donationRepo.update(id, {
      status: DonationStatus.CONFIRMED,
      confirmedAt: new Date(),
      confirmedBy: confirmedBy as never,
    });

    await this.campaignRepo.incrementRaised(donation.campaignId.toString(), donation.amount);
    this.emitter.emit(EVENTS.DONATION_CONFIRMED, { donationId: id, amount: donation.amount });
    return updated;
  }

  async rejectDonation(id: string, rejectionReason: string) {
    const donation = await this.donationRepo.findById(id);
    if (!donation) throw new NotFoundException('Donation not found');
    return this.donationRepo.update(id, { status: DonationStatus.REJECTED, rejectionReason });
  }

  getFundraisingProgress(raisedAmount: number) {
    return {
      raisedAmount,
      stages: DEFAULT_STAGES.map(s => ({
        ...s,
        completed: raisedAmount >= s.targetAmount,
        progressPercent: Math.min(100, Math.round((raisedAmount / s.targetAmount) * 100)),
      })),
      currentStage: DEFAULT_STAGES.filter(s => raisedAmount < s.targetAmount)[0] ?? DEFAULT_STAGES[DEFAULT_STAGES.length - 1],
    };
  }
}
