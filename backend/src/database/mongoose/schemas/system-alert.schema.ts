import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AlertSeverity, AlertType, AlertStatus } from '@shared/enums/admin-operations.enum';

export type SystemAlertDocument = SystemAlert & Document;

@Schema({ collection: 'system_alerts', timestamps: true })
export class SystemAlert {
  @Prop({ type: String, enum: AlertType, required: true })
  type: AlertType;

  @Prop({ type: String, enum: AlertSeverity, required: true })
  severity: AlertSeverity;

  @Prop({ type: String, enum: AlertStatus, default: AlertStatus.ACTIVE })
  status: AlertStatus;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop({ default: false })
  emailSent: boolean;

  @Prop({ type: Date })
  emailSentAt?: Date;

  @Prop({ type: Types.ObjectId })
  acknowledgedBy?: Types.ObjectId;

  @Prop({ type: Date })
  acknowledgedAt?: Date;

  @Prop({ type: Types.ObjectId })
  resolvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  resolvedAt?: Date;

  @Prop()
  resolutionNote?: string;
}

export const SystemAlertSchema = SchemaFactory.createForClass(SystemAlert);
SystemAlertSchema.index({ status: 1, severity: -1, createdAt: -1 });
SystemAlertSchema.index({ type: 1, status: 1 });
SystemAlertSchema.index({ createdAt: -1 });
