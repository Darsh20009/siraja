import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * Collection: tajweed_observations
 *
 * One document per tajweed rule application observed by the audio pipeline.
 * Stored separately from AudioSession to allow independent querying by
 * rule and outcome for sheikh reporting and per-student tajweed profiles.
 */
@Schema({ timestamps: true, collection: 'tajweed_observations' })
export class TajweedObservation {
  @Prop({ type: Types.ObjectId, ref: 'AudioSession', required: true })
  session: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AudioSegment', required: false })
  segment?: Types.ObjectId;

  @Prop({
    type: String,
    enum: [
      'madd_tabii', 'madd_muttasil', 'madd_munfasil', 'madd_lazim',
      'ghunna', 'qalqala', 'idgham_bighunn', 'idgham_bilaghunn',
      'iqlab', 'ikhfa', 'izhar', 'tafkhim', 'tarqiq', 'waqf_tam', 'waqf_kafi',
    ],
    required: true,
  })
  rule: string;

  @Prop({
    type: String,
    enum: ['correct', 'incorrect', 'undetectable'],
    required: true,
  })
  outcome: string;

  @Prop({ type: Number, required: false }) expectedCounts?: number;
  @Prop({ type: Number, required: false }) measuredCounts?: number;
  @Prop({ type: Number, required: false }) surahNumber?: number;
  @Prop({ type: Number, required: false }) ayahNumber?: number;
  @Prop({ type: Number, required: false }) wordIndex?: number;
  @Prop({ type: Number, required: false }) startSeconds?: number;
  @Prop({ type: String, required: true }) description: string;

  readonly createdAt: Date;
}

export type TajweedObservationDocument = HydratedDocument<TajweedObservation>;
export const TajweedObservationSchema = SchemaFactory.createForClass(TajweedObservation);

TajweedObservationSchema.index({ tenantId: 1, session: 1 });
TajweedObservationSchema.index({ tenantId: 1, student: 1, rule: 1 });
TajweedObservationSchema.index({ tenantId: 1, student: 1, outcome: 1 });
TajweedObservationSchema.index({ tenantId: 1, student: 1, createdAt: -1 });
