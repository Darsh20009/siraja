import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FeatureRequestStatus, FeatureRequestPriority } from '@shared/enums/admin-operations.enum';

export type FeatureRequestDocument = FeatureRequest & Document;

@Schema({ collection: 'feature_requests', timestamps: true })
export class FeatureRequest {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  submittedBy?: Types.ObjectId;

  @Prop({ type: String, ref: 'Tenant' })
  tenantId?: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: FeatureRequestStatus, default: FeatureRequestStatus.PROPOSED })
  status: FeatureRequestStatus;

  @Prop({ type: String, enum: FeatureRequestPriority, default: FeatureRequestPriority.MEDIUM })
  priority: FeatureRequestPriority;

  @Prop({ default: 0 })
  voteCount: number;

  @Prop()
  adminResponse?: string;

  @Prop()
  rejectionReason?: string;

  @Prop({ type: Types.ObjectId })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const FeatureRequestSchema = SchemaFactory.createForClass(FeatureRequest);
FeatureRequestSchema.index({ status: 1, voteCount: -1 });
FeatureRequestSchema.index({ tenantId: 1, status: 1 });
FeatureRequestSchema.index({ submittedBy: 1 });
