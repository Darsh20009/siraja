import { FeatureFollow } from '@database/mongoose/schemas';

export const FEATURE_FOLLOW_REPOSITORY = 'FEATURE_FOLLOW_REPOSITORY';

export interface IFeatureFollowRepository {
  findByFeature(featureRequestId: string): Promise<FeatureFollow[]>;
  isFollowing(featureRequestId: string, userId: string): Promise<boolean>;
  countByFeature(featureRequestId: string): Promise<number>;
  create(data: Partial<FeatureFollow>): Promise<FeatureFollow>;
  delete(featureRequestId: string, userId: string): Promise<void>;
}
