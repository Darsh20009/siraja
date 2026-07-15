import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeatureVote, FeatureVoteDocument } from '@database/mongoose/schemas';
import { IFeatureVoteRepository } from '../../domain/repositories/feature-vote.repository.interface';

@Injectable()
export class FeatureVoteRepository implements IFeatureVoteRepository {
  constructor(@InjectModel(FeatureVote.name) private readonly model: Model<FeatureVoteDocument>) {}

  findByFeature(featureRequestId: string) {
    return this.model.find({ featureRequestId: new Types.ObjectId(featureRequestId) }).exec();
  }

  async hasVoted(featureRequestId: string, userId: string): Promise<boolean> {
    const doc = await this.model.findOne({
      featureRequestId: new Types.ObjectId(featureRequestId),
      userId: new Types.ObjectId(userId),
    }).exec();
    return doc !== null;
  }

  create(data: Partial<FeatureVote>) {
    return this.model.create(data);
  }

  async delete(featureRequestId: string, userId: string) {
    await this.model.deleteOne({
      featureRequestId: new Types.ObjectId(featureRequestId),
      userId: new Types.ObjectId(userId),
    }).exec();
  }

  countByFeature(featureRequestId: string): Promise<number> {
    return this.model.countDocuments({ featureRequestId: new Types.ObjectId(featureRequestId) }).exec();
  }
}
