import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OperationalSnapshotDocument = OperationalSnapshot & Document;

/**
 * Daily platform-wide snapshot — captured by a scheduled job.
 * Used to power Operational Analytics without live aggregation.
 */
@Schema({ collection: 'operational_snapshots', timestamps: true })
export class OperationalSnapshot {
  /** ISO date string: YYYY-MM-DD */
  @Prop({ required: true })
  date: string;

  // ── Platform totals ──────────────────────────────────────────────────────

  @Prop({ default: 0 }) totalUsers: number;
  @Prop({ default: 0 }) totalTenants: number;
  @Prop({ default: 0 }) totalStudents: number;
  @Prop({ default: 0 }) totalSheikhs: number;
  @Prop({ default: 0 }) totalParents: number;
  @Prop({ default: 0 }) totalSupervisors: number;
  @Prop({ default: 0 }) totalCircles: number;

  // ── Daily activity ───────────────────────────────────────────────────────

  @Prop({ default: 0 }) dailyActiveUsers: number;
  @Prop({ default: 0 }) dailyMemorizationRecords: number;
  @Prop({ default: 0 }) dailyReviewRecords: number;
  @Prop({ default: 0 }) dailyAttendanceRecords: number;
  @Prop({ default: 0 }) dailyAiRequests: number;

  // ── Growth (delta from previous day) ────────────────────────────────────

  @Prop({ default: 0 }) newUsersToday: number;
  @Prop({ default: 0 }) newStudentsToday: number;
  @Prop({ default: 0 }) newTenantsToday: number;

  // ── Infrastructure ───────────────────────────────────────────────────────

  @Prop({ default: 0 }) storageUsedMb: number;
  @Prop({ default: 0 }) emailsSentToday: number;
  @Prop({ default: 0 }) queueJobsProcessed: number;
  @Prop({ default: 0 }) queueJobsFailed: number;

  // ── Donations ────────────────────────────────────────────────────────────

  @Prop({ default: 0 }) totalDonationsToday: number;
  @Prop({ default: 0 }) totalDonationAmountToday: number;
  @Prop({ default: 0 }) cumulativeDonationAmount: number;

  // ── Engagement ───────────────────────────────────────────────────────────

  @Prop({ default: 0 }) activeStreaks: number;
  @Prop({ default: 0 }) openTickets: number;
  @Prop({ default: 0 }) openAlerts: number;
}

export const OperationalSnapshotSchema = SchemaFactory.createForClass(OperationalSnapshot);
OperationalSnapshotSchema.index({ date: 1 }, { unique: true });
