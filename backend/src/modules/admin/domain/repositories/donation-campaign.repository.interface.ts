import { DonationCampaign } from '@database/mongoose/schemas';
import { CampaignStatus } from '@shared/enums/admin-operations.enum';

export const DONATION_CAMPAIGN_REPOSITORY = 'DONATION_CAMPAIGN_REPOSITORY';

export interface IDonationCampaignRepository {
  findAll(filter?: { status?: CampaignStatus }): Promise<DonationCampaign[]>;
  findById(id: string): Promise<DonationCampaign | null>;
  findPublicActive(): Promise<DonationCampaign[]>;
  create(data: Partial<DonationCampaign>): Promise<DonationCampaign>;
  update(id: string, data: Partial<DonationCampaign>): Promise<DonationCampaign | null>;
  incrementRaised(id: string, amount: number): Promise<void>;
  delete(id: string): Promise<void>;
}
