import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeatureFollowDocument = FeatureFollow & Document;

/**
 * Tracks users who follow a feature request to receive status updates.
 * Distinct from a vote: a user can follow without voting, and vice-versa.
 */
@Schema({ collection: 'feature_follows', timestamps: true })
export class FeatureFollow {
  @Prop({ type: Types.ObjectId, ref: 'FeatureRequest', required: true })
  featureRequestId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, ref: 'Tenant' })
  tenantId?: string;
}

export const FeatureFollowSchema = SchemaFactory.createForClass(FeatureFollow);
// One follow record per user per feature
FeatureFollowSchema.index({ featureRequestId: 1, userId: 1 }, { unique: true });
FeatureFollowSchema.index({ featureRequestId: 1 });
FeatureFollowSchema.index({ userId: 1 });
