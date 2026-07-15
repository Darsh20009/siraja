import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeatureVoteDocument = FeatureVote & Document;

@Schema({ collection: 'feature_votes', timestamps: true })
export class FeatureVote {
  @Prop({ type: Types.ObjectId, ref: 'FeatureRequest', required: true })
  featureRequestId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, ref: 'Tenant' })
  tenantId?: string;
}

export const FeatureVoteSchema = SchemaFactory.createForClass(FeatureVote);
// One vote per user per feature
FeatureVoteSchema.index({ featureRequestId: 1, userId: 1 }, { unique: true });
FeatureVoteSchema.index({ featureRequestId: 1 });
FeatureVoteSchema.index({ userId: 1 });
