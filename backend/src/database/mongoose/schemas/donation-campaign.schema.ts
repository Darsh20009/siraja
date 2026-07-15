import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CampaignStatus } from '@shared/enums/admin-operations.enum';

export type DonationCampaignDocument = DonationCampaign & Document;

export interface FundraisingStage {
  stageNumber: number;
  label: string;
  targetAmount: number;
  completedAt?: Date;
}

@Schema({ collection: 'donation_campaigns', timestamps: true })
export class DonationCampaign {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, type: Number })
  targetAmount: number;

  @Prop({ default: 0, type: Number })
  raisedAmount: number;

  @Prop({ type: String, enum: CampaignStatus, default: CampaignStatus.ACTIVE })
  status: CampaignStatus;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ type: [Object], default: [] })
  stages: FundraisingStage[];

  @Prop()
  coverImageUrl?: string;

  @Prop({ type: Boolean, default: true })
  isPublic: boolean;

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;
}

export const DonationCampaignSchema = SchemaFactory.createForClass(DonationCampaign);
DonationCampaignSchema.index({ status: 1 });
DonationCampaignSchema.index({ isPublic: 1, status: 1 });
