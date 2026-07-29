import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

// ── Embedded: AudioScoreBreakdown ─────────────────────────────────────────────

@Schema({ _id: false })
class AudioScoreBreakdown {
  @Prop({ type: Number, required: true, min: 0, max: 100 }) accuracyScore: number;
  @Prop({ type: Number, required: true, min: 0, max: 100 }) fluencyScore: number;
  @Prop({ type: Number, required: true, min: 0, max: 100 }) tajweedScore: number;
  @Prop({ type: Number, required: true, min: 0, max: 100 }) consistencyScore: number;
  @Prop({ type: Number, required: true, min: 0, max: 100 }) asrConfidenceScore: number;
}
const AudioScoreBreakdownSchema = SchemaFactory.createForClass(AudioScoreBreakdown);

// ── Embedded: AudioScore ─────────────────────────────────────────────────────

@Schema({ _id: false })
class AudioScoreEmbed {
  @Prop({ type: String, required: true }) sessionId: string;
  @Prop({ type: Number, required: true, min: 0, max: 100 }) compositeScore: number;
  @Prop({ type: AudioScoreBreakdownSchema, required: true }) breakdown: AudioScoreBreakdown;
  @Prop({ type: Number, required: true, default: 0 }) totalExpectedWords: number;
  @Prop({ type: Number, required: true, default: 0 }) correctWords: number;
  @Prop({ type: Number, required: true, default: 0 }) insertedWords: number;
  @Prop({ type: Number, required: true, default: 0 }) deletedWords: number;
  @Prop({ type: Number, required: true, default: 0 }) totalMistakes: number;
  @Prop({ type: Number, required: true, default: 0 }) criticalMistakes: number;
  @Prop({ type: Number, required: true, default: 0 }) majorMistakes: number;
  @Prop({ type: Number, required: true, default: 0 }) minorMistakes: number;
  @Prop({ type: Number, required: true, default: 0 }) wordsPerMinute: number;
  @Prop({ type: Number, required: true, default: 0 }) speechDurationSeconds: number;
  @Prop({
    type: String,
    enum: ['excellent', 'good', 'satisfactory', 'needs_improvement'],
    required: true,
  })
  tier: string;
}
const AudioScoreEmbedSchema = SchemaFactory.createForClass(AudioScoreEmbed);

// ── Embedded: AudioRecommendation ────────────────────────────────────────────

@Schema({ _id: false })
class AudioRecommendationEmbed {
  @Prop({ type: String, required: true }) type: string;
  @Prop({ type: String, required: true }) priority: string;
  @Prop({ type: String, required: true }) title: string;
  @Prop({ type: String, required: true }) description: string;
  @Prop({ type: String, required: true }) triggeredBy: string;
  @Prop({ type: Boolean, required: true }) actionable: boolean;
  @Prop({ type: Object, required: false }) target?: Record<string, unknown>;
  @Prop({ type: String, required: false }) tajweedRule?: string;
}
const AudioRecommendationEmbedSchema = SchemaFactory.createForClass(AudioRecommendationEmbed);

// ── AudioSession ─────────────────────────────────────────────────────────────

/**
 * Collection: audio_sessions
 *
 * One document per student audio upload. Sub-documents (segments, mistakes,
 * tajweed observations) live in separate collections but are referenced
 * by sessionId for independent queryability.
 *
 * Score and recommendations are embedded here because they are always
 * needed alongside the session summary.
 */
@Schema({ timestamps: true, collection: 'audio_sessions' })
export class AudioSession extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MemorizationRecord', required: false })
  memorizationRecord?: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 114 })
  surahNumber: number;

  @Prop({ type: Number, required: true, min: 1 })
  fromAyah: number;

  @Prop({ type: Number, required: true, min: 1 })
  toAyah: number;

  @Prop({ type: String, required: true, trim: true })
  fileKey: string;

  @Prop({
    type: String,
    enum: ['wav', 'mp3', 'ogg', 'webm', 'm4a', 'flac'],
    required: true,
  })
  format: string;

  @Prop({ type: Number, required: true, min: 0 })
  durationSeconds: number;

  @Prop({ type: Number, required: true, min: 0 })
  fileSizeBytes: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  sampleRate: number;

  @Prop({ type: Number, required: true, min: 0, default: 1 })
  channels: number;

  @Prop({
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'no_asr'],
    required: true,
    default: 'pending',
  })
  status: string;

  @Prop({ type: String, required: false })
  errorMessage?: string;

  @Prop({ type: AudioScoreEmbedSchema, required: false })
  score?: AudioScoreEmbed;

  @Prop({ type: [AudioRecommendationEmbedSchema], default: [] })
  recommendations: AudioRecommendationEmbed[];

  @Prop({ type: Number, required: true, default: 0 })
  totalSegments: number;

  @Prop({ type: Number, required: true, default: 0 })
  totalMistakes: number;

  @Prop({ type: Number, required: true, default: 0 })
  criticalMistakes: number;

  @Prop({ type: Number, required: true, default: 0 })
  tajweedObservationCount: number;

  @Prop({ type: Date, required: false })
  processedAt?: Date;
}

export type AudioSessionDocument = HydratedDocument<AudioSession>;
export const AudioSessionSchema = SchemaFactory.createForClass(AudioSession);

AudioSessionSchema.index({ tenantId: 1, student: 1, createdAt: -1 });
AudioSessionSchema.index({ tenantId: 1, student: 1, status: 1 });
AudioSessionSchema.index({ tenantId: 1, status: 1 });
AudioSessionSchema.index({ tenantId: 1, student: 1, surahNumber: 1 });
