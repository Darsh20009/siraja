import { FeatureVote } from '@database/mongoose/schemas';

export const FEATURE_VOTE_REPOSITORY = 'FEATURE_VOTE_REPOSITORY';

export interface IFeatureVoteRepository {
  findByFeature(featureRequestId: string): Promise<FeatureVote[]>;
  hasVoted(featureRequestId: string, userId: string): Promise<boolean>;
  create(data: Partial<FeatureVote>): Promise<FeatureVote>;
  delete(featureRequestId: string, userId: string): Promise<void>;
  countByFeature(featureRequestId: string): Promise<number>;
}
