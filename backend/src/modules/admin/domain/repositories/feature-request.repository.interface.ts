import { FeatureRequest } from '@database/mongoose/schemas';
import { FeatureRequestStatus } from '@shared/enums/admin-operations.enum';

export const FEATURE_REQUEST_REPOSITORY = 'FEATURE_REQUEST_REPOSITORY';

export interface IFeatureRequestRepository {
  findAll(filter?: { status?: FeatureRequestStatus }): Promise<FeatureRequest[]>;
  findById(id: string): Promise<FeatureRequest | null>;
  findTopVoted(limit?: number): Promise<FeatureRequest[]>;
  create(data: Partial<FeatureRequest>): Promise<FeatureRequest>;
  update(id: string, data: Partial<FeatureRequest>): Promise<FeatureRequest | null>;
  incrementVotes(id: string, delta: 1 | -1): Promise<void>;
  delete(id: string): Promise<void>;
}
