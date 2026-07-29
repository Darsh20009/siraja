import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * Collection: audio_mistake_detections
 *
 * One document per recitation mistake detected by the audio pipeline.
 * Stored in a separate collection (not embedded in AudioSession) to allow
 * independent querying by type, severity, and surah/ayah for sheikh
 * reporting and intelligence insights.
 */
@Schema({ timestamps: true, collection: 'audio_mistake_detections' })
export class AudioMistakeDetection {
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
      'wrong_word', 'skipped_word', 'repeated_word', 'wrong_ayah_order',
      'skipped_ayah', 'pronunciation_error', 'madd_error', 'ghunna_error',
      'qalqala_error', 'waqf_error', 'idgham_error', 'iqlab_error', 'ikhfa_error',
    ],
    required: true,
  })
  type: string;

  @Prop({
    type: String,
    enum: ['critical', 'major', 'minor'],
    required: true,
  })
  severity: string;

  @Prop({ type: Number, required: false }) surahNumber?: number;
  @Prop({ type: Number, required: false }) ayahNumber?: number;
  @Prop({ type: Number, required: false }) wordIndex?: number;
  @Prop({ type: String, required: false }) recognisedText?: string;
  @Prop({ type: String, required: false }) expectedText?: string;
  @Prop({ type: Number, required: false }) startSeconds?: number;
  @Prop({ type: String, required: true }) description: string;
  @Prop({ type: Boolean, required: true, default: false }) isRecurring: boolean;

  readonly createdAt: Date;
}

export type AudioMistakeDetectionDocument = HydratedDocument<AudioMistakeDetection>;
export const AudioMistakeDetectionSchema = SchemaFactory.createForClass(AudioMistakeDetection);

AudioMistakeDetectionSchema.index({ tenantId: 1, session: 1 });
AudioMistakeDetectionSchema.index({ tenantId: 1, student: 1, type: 1 });
AudioMistakeDetectionSchema.index({ tenantId: 1, student: 1, severity: 1 });
AudioMistakeDetectionSchema.index({ tenantId: 1, student: 1, createdAt: -1 });
