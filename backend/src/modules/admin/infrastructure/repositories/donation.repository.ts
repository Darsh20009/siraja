import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Donation, DonationDocument } from '@database/mongoose/schemas';
import { IDonationRepository } from '../../domain/repositories/donation.repository.interface';
import { DonationStatus } from '@shared/enums/admin-operations.enum';

@Injectable()
export class DonationRepository implements IDonationRepository {
  constructor(@InjectModel(Donation.name) private readonly model: Model<DonationDocument>) {}

  findAll(filter?: { campaignId?: string; status?: DonationStatus; donorUserId?: string }) {
    const q: Record<string, unknown> = {};
    if (filter?.campaignId) q.campaignId = new Types.ObjectId(filter.campaignId);
    if (filter?.status) q.status = filter.status;
    if (filter?.donorUserId) q.donorUserId = new Types.ObjectId(filter.donorUserId);
    return this.model.find(q).sort({ createdAt: -1 }).exec();
  }

  findById(id: string) {
    return this.model.findById(new Types.ObjectId(id)).exec();
  }

  findByCampaign(campaignId: string) {
    return this.model.find({ campaignId: new Types.ObjectId(campaignId) }).sort({ createdAt: -1 }).exec();
  }

  create(data: Partial<Donation>) {
    return this.model.create(data);
  }

  update(id: string, data: Partial<Donation>) {
    return this.model.findByIdAndUpdate(new Types.ObjectId(id), { $set: data }, { new: true }).exec();
  }

  async sumConfirmedByCampaign(campaignId: string): Promise<number> {
    const result = await this.model.aggregate([
      { $match: { campaignId: new Types.ObjectId(campaignId), status: DonationStatus.CONFIRMED } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  async sumConfirmedGlobal(): Promise<number> {
    const result = await this.model.aggregate([
      { $match: { status: DonationStatus.CONFIRMED } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  countByCampaign(campaignId: string): Promise<number> {
    return this.model.countDocuments({ campaignId: new Types.ObjectId(campaignId) }).exec();
  }
}
