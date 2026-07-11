import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseGlobalSchema } from './base-global.schema';

/**
 * Collection: system_settings
 *
 * Platform-wide, super-admin-managed configuration (NOT tenant-scoped).
 * Modeled as a small set of singleton documents keyed by `key`
 * (e.g. "maintenance_mode", "default_trial_days") rather than one giant
 * document, so unrelated settings don't contend on the same write lock.
 */
@Schema({ timestamps: true, collection: 'system_settings' })
export class SystemSettings extends BaseGlobalSchema {
  @Prop({ type: String, required: true, unique: true, trim: true, lowercase: true })
  key: string;

  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: Object, required: true })
  value: Record<string, unknown>;
}

export type SystemSettingsDocument = HydratedDocument<SystemSettings>;
export const SystemSettingsSchema = SchemaFactory.createForClass(SystemSettings);

// `key` is already uniquely indexed via `unique: true` on the @Prop above.
