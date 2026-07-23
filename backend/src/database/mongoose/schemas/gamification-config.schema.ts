import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseSchema } from './base.schema';
import { PointActivityType } from '@shared/enums/gamification.enum';

/**
 * Collection: gamification_configs
 *
 * Per-tenant point values for each PointActivityType.
 * One document per tenant. Seeded with platform defaults when the tenant
 * is first activated; admins may update values at any time.
 */
@Schema({ timestamps: true, collection: 'gamification_configs' })
export class GamificationConfig extends BaseSchema {
  /** Map of activity → point value. Stored as a plain JS object so new
   *  activity types can be added without a migration. */
  @Prop({
    type: Object,
    required: true,
    default: () => ({
      [PointActivityType.MEMORIZATION_COMPLETION]: 100,
      [PointActivityType.REVISION_COMPLETION]: 50,
      [PointActivityType.ATTENDANCE]: 20,
      [PointActivityType.EXAM_SUCCESS]: 150,
      [PointActivityType.DAILY_STREAK]: 10,
      [PointActivityType.WEEKLY_STREAK]: 50,
      [PointActivityType.MONTHLY_STREAK]: 200,
      [PointActivityType.AI_SESSION]: 30,
      [PointActivityType.COMMUNITY_PARTICIPATION]: 15,
    }),
  })
  pointValues: Record<PointActivityType, number>;

  @Prop({ type: Boolean, default: true })
  gamificationEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  leaderboardEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  achievementsEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  badgesEnabled: boolean;
}

export type GamificationConfigDocument = HydratedDocument<GamificationConfig>;
export const GamificationConfigSchema = SchemaFactory.createForClass(GamificationConfig);

// Uniqueness (one config per tenant) is enforced at the application layer.
// BaseSchema already declares index: true on tenantId; a duplicate standalone
// { tenantId: 1 } index here would cause a Mongoose duplicate-index warning.
