import { Donation } from '@database/mongoose/schemas';
import { DonationStatus } from '@shared/enums/admin-operations.enum';

export const DONATION_REPOSITORY = 'DONATION_REPOSITORY';

export interface IDonationRepository {
  findAll(filter?: { campaignId?: string; status?: DonationStatus; donorUserId?: string }): Promise<Donation[]>;
  findById(id: string): Promise<Donation | null>;
  findByCampaign(campaignId: string): Promise<Donation[]>;
  create(data: Partial<Donation>): Promise<Donation>;
  update(id: string, data: Partial<Donation>): Promise<Donation | null>;
  sumConfirmedByCampaign(campaignId: string): Promise<number>;
  countByCampaign(campaignId: string): Promise<number>;
}
