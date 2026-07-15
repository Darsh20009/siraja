import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeatureRequest, FeatureRequestDocument } from '@database/mongoose/schemas';
import { IFeatureRequestRepository } from '../../domain/repositories/feature-request.repository.interface';
import { FeatureRequestStatus } from '@shared/enums/admin-operations.enum';

@Injectable()
export class FeatureRequestRepository implements IFeatureRequestRepository {
  constructor(@InjectModel(FeatureRequest.name) private readonly model: Model<FeatureRequestDocument>) {}

  findAll(filter?: { status?: FeatureRequestStatus }) {
    const q: Record<string, unknown> = {};
    if (filter?.status) q.status = filter.status;
    return this.model.find(q).sort({ voteCount: -1, createdAt: -1 }).exec();
  }

  findById(id: string) {
    return this.model.findById(new Types.ObjectId(id)).exec();
  }

  findTopVoted(limit = 20) {
    return this.model.find().sort({ voteCount: -1 }).limit(limit).exec();
  }

  create(data: Partial<FeatureRequest>) {
    return this.model.create(data);
  }

  update(id: string, data: Partial<FeatureRequest>) {
    return this.model.findByIdAndUpdate(new Types.ObjectId(id), { $set: data }, { new: true }).exec();
  }

  async incrementVotes(id: string, delta: 1 | -1) {
    await this.model.findByIdAndUpdate(new Types.ObjectId(id), { $inc: { voteCount: delta } }).exec();
  }

  async delete(id: string) {
    await this.model.findByIdAndDelete(new Types.ObjectId(id)).exec();
  }
}
