import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DonationStatus, DonationMethod } from '@shared/enums/admin-operations.enum';

export type DonationDocument = Donation & Document;

@Schema({ collection: 'donations', timestamps: true })
export class Donation {
  @Prop({ type: Types.ObjectId, ref: 'DonationCampaign', required: true })
  campaignId: Types.ObjectId;

  /** null when anonymous */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  donorUserId?: Types.ObjectId;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ default: 'SAR' })
  currency: string;

  @Prop({ type: String, enum: DonationMethod, default: DonationMethod.BANK_TRANSFER })
  method: DonationMethod;

  @Prop({ type: String, enum: DonationStatus, default: DonationStatus.PENDING })
  status: DonationStatus;

  @Prop({ default: true })
  isAnonymous: boolean;

  /** Shown publicly if donor allows it */
  @Prop()
  donorName?: string;

  @Prop()
  donorPhone?: string;

  @Prop()
  donorEmail?: string;

  @Prop()
  note?: string;

  @Prop()
  receiptUrl?: string;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: Types.ObjectId })
  confirmedBy?: Types.ObjectId;

  @Prop()
  rejectionReason?: string;
}

export const DonationSchema = SchemaFactory.createForClass(Donation);
DonationSchema.index({ campaignId: 1, status: 1 });
DonationSchema.index({ donorUserId: 1 });
DonationSchema.index({ status: 1, createdAt: -1 });
