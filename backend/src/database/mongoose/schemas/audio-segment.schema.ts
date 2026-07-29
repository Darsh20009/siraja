import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

// ── Embedded: WordAlignment ──────────────────────────────────────────────────

/**
 * WordAlignment is embedded within AudioSegment (always accessed together,
 * max ~20 words per segment — no queryability requirement).
 */
@Schema({ _id: false })
class WordAlignmentEmbed {
  @Prop({ type: String, required: true }) recognisedText: string;
  @Prop({ type: String, required: false }) expectedText?: string;
  @Prop({ type: Number, required: false }) surahNumber?: number;
  @Prop({ type: Number, required: false }) ayahNumber?: number;
  @Prop({ type: Number, required: false }) wordIndex?: number;
  @Prop({ type: Number, required: true }) startSeconds: number;
  @Prop({ type: Number, required: true }) endSeconds: number;
  @Prop({ type: Number, required: true, min: 0, max: 1 }) confidence: number;
  @Prop({ type: Boolean, required: true }) isMatch: boolean;
  @Prop({ type: Number, required: true, default: 999 }) editDistance: number;
}
const WordAlignmentEmbedSchema = SchemaFactory.createForClass(WordAlignmentEmbed);

// ── AudioSegment ─────────────────────────────────────────────────────────────

/**
 * Collection: audio_segments
 *
 * One document per VAD-detected speech segment within an audio session.
 * Word alignments are embedded (one-to-many, bounded by segment size).
 * Queried by sessionId to load all segments for a given session.
 */
@Schema({ timestamps: true, collection: 'audio_segments' })
export class AudioSegment {
  @Prop({ type: Types.ObjectId, ref: 'AudioSession', required: true })
  session: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  segmentIndex: number;

  @Prop({ type: Number, required: true, min: 0 })
  startSeconds: number;

  @Prop({ type: Number, required: true, min: 0 })
  endSeconds: number;

  @Prop({ type: Number, required: true, min: 0 })
  durationSeconds: number;

  @Prop({ type: Number, required: true, min: 0, max: 1 })
  voiceActivityConfidence: number;

  @Prop({ type: Number, required: false }) surahNumber?: number;
  @Prop({ type: Number, required: false }) fromAyah?: number;
  @Prop({ type: Number, required: false }) toAyah?: number;

  @Prop({ type: Number, required: true, default: -80 })
  energyDbfs: number;

  @Prop({ type: Number, required: true, default: 0 })
  pitchHz: number;

  @Prop({ type: [WordAlignmentEmbedSchema], default: [] })
  wordAlignments: WordAlignmentEmbed[];

  readonly createdAt: Date;
}

export type AudioSegmentDocument = HydratedDocument<AudioSegment>;
export const AudioSegmentSchema = SchemaFactory.createForClass(AudioSegment);

AudioSegmentSchema.index({ tenantId: 1, session: 1, segmentIndex: 1 });
AudioSegmentSchema.index({ session: 1 });
