import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FeedbackType, FeedbackStatus } from '@shared/enums/admin-operations.enum';

export type FeedbackDocument = Feedback & Document;

@Schema({ collection: 'feedback', timestamps: true })
export class Feedback {
  /** null when anonymous */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ type: String, ref: 'Tenant' })
  tenantId?: string;

  @Prop({ type: String, enum: FeedbackType, default: FeedbackType.GENERAL })
  type: FeedbackType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: Number, min: 1, max: 5 })
  rating?: number;

  @Prop({ type: String, enum: FeedbackStatus, default: FeedbackStatus.OPEN })
  status: FeedbackStatus;

  @Prop({ default: false })
  isAnonymous: boolean;

  @Prop()
  submitterName?: string;

  @Prop()
  submitterEmail?: string;

  @Prop()
  adminNotes?: string;

  @Prop({ type: Types.ObjectId })
  resolvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  resolvedAt?: Date;

  /** When true, the feedback is visible on the public community wall. */
  @Prop({ default: false })
  isPublic: boolean;

  /** Tags for categorisation */
  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
FeedbackSchema.index({ type: 1, status: 1 });
FeedbackSchema.index({ tenantId: 1, createdAt: -1 });
FeedbackSchema.index({ status: 1, createdAt: -1 });
