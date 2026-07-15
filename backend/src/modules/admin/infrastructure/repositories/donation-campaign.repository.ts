import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DonationCampaign, DonationCampaignDocument } from '@database/mongoose/schemas';
import { IDonationCampaignRepository } from '../../domain/repositories/donation-campaign.repository.interface';
import { CampaignStatus } from '@shared/enums/admin-operations.enum';

@Injectable()
export class DonationCampaignRepository implements IDonationCampaignRepository {
  constructor(@InjectModel(DonationCampaign.name) private readonly model: Model<DonationCampaignDocument>) {}

  findAll(filter?: { status?: CampaignStatus }) {
    const q: Record<string, unknown> = {};
    if (filter?.status) q.status = filter.status;
    return this.model.find(q).sort({ createdAt: -1 }).exec();
  }

  findById(id: string) {
    return this.model.findById(new Types.ObjectId(id)).exec();
  }

  findPublicActive() {
    return this.model.find({ isPublic: true, status: CampaignStatus.ACTIVE }).exec();
  }

  create(data: Partial<DonationCampaign>) {
    return this.model.create(data);
  }

  update(id: string, data: Partial<DonationCampaign>) {
    return this.model.findByIdAndUpdate(new Types.ObjectId(id), { $set: data }, { new: true }).exec();
  }

  async incrementRaised(id: string, amount: number) {
    await this.model.findByIdAndUpdate(new Types.ObjectId(id), { $inc: { raisedAmount: amount } }).exec();
  }

  async delete(id: string) {
    await this.model.findByIdAndDelete(new Types.ObjectId(id)).exec();
  }
}
