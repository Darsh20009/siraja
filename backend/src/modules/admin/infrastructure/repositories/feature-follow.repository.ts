import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeatureFollow, FeatureFollowDocument } from '@database/mongoose/schemas';
import { IFeatureFollowRepository } from '../../domain/repositories/feature-follow.repository.interface';

@Injectable()
export class FeatureFollowRepository implements IFeatureFollowRepository {
  constructor(@InjectModel(FeatureFollow.name) private readonly model: Model<FeatureFollowDocument>) {}

  findByFeature(featureRequestId: string) {
    return this.model.find({ featureRequestId: new Types.ObjectId(featureRequestId) }).exec();
  }

  async isFollowing(featureRequestId: string, userId: string): Promise<boolean> {
    const doc = await this.model.findOne({
      featureRequestId: new Types.ObjectId(featureRequestId),
      userId: new Types.ObjectId(userId),
    }).exec();
    return doc !== null;
  }

  countByFeature(featureRequestId: string): Promise<number> {
    return this.model.countDocuments({ featureRequestId: new Types.ObjectId(featureRequestId) }).exec();
  }

  create(data: Partial<FeatureFollow>) {
    return this.model.create(data);
  }

  async delete(featureRequestId: string, userId: string) {
    await this.model.deleteOne({
      featureRequestId: new Types.ObjectId(featureRequestId),
      userId: new Types.ObjectId(userId),
    }).exec();
  }
}
