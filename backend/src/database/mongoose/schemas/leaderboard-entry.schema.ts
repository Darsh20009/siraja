import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseSchema } from './base.schema';
import { LeaderboardEntityType, LeaderboardPeriod } from '@shared/enums/gamification.enum';

/**
 * Collection: leaderboard_entries
 *
 * Snapshot-based leaderboard entries. Refreshed periodically by the
 * LeaderboardService (on-demand or via a scheduled job in Phase 13).
 * One document per (tenantId, entityId, entityType, period, periodKey).
 */
@Schema({ timestamps: true, collection: 'leaderboard_entries' })
export class LeaderboardEntry extends BaseSchema {
  /** The entity being ranked (studentId, circleId, sheikhId, tenantId). */
  @Prop({ type: String, required: true })
  entityId: string;

  @Prop({ type: String, enum: LeaderboardEntityType, required: true })
  entityType: LeaderboardEntityType;

  /** Display name for the entity (denormalised for read performance). */
  @Prop({ type: String, required: true, trim: true })
  entityName: string;

  @Prop({ type: String, enum: LeaderboardPeriod, required: true })
  period: LeaderboardPeriod;

  /**
   * Identifies the specific period instance:
   * - daily → YYYY-MM-DD
   * - weekly → YYYY-WNN (ISO week)
   * - monthly → YYYY-MM
   * - yearly → YYYY
   * - all_time → 'all'
   */
  @Prop({ type: String, required: true })
  periodKey: string;

  @Prop({ type: Number, required: true, default: 0 })
  points: number;

  @Prop({ type: Number, required: true, default: 0 })
  rank: number;

  @Prop({ type: Number, required: true, default: 0 })
  achievementCount: number;

  @Prop({ type: Number, required: true, default: 0 })
  badgeCount: number;

  /** ISO datetime of when this snapshot was computed. */
  @Prop({ type: String, required: true })
  computedAt: string;
}

export type LeaderboardEntryDocument = HydratedDocument<LeaderboardEntry>;
export const LeaderboardEntrySchema = SchemaFactory.createForClass(LeaderboardEntry);

LeaderboardEntrySchema.index(
  { tenantId: 1, entityType: 1, period: 1, periodKey: 1, entityId: 1 },
  { unique: true },
);
LeaderboardEntrySchema.index({ tenantId: 1, entityType: 1, period: 1, periodKey: 1, rank: 1 });
LeaderboardEntrySchema.index({ tenantId: 1, entityType: 1, period: 1, periodKey: 1, points: -1 });
