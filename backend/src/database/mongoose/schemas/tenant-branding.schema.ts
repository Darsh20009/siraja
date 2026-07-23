import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TenantBrandingDocument = TenantBranding & Document;

export interface ColorPalette {
  primary: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
}

export interface FeatureFlags {
  gamificationEnabled: boolean;
  aiEnabled: boolean;
  donationsEnabled: boolean;
  announcementsEnabled: boolean;
  messagingEnabled: boolean;
  smartMushafEnabled: boolean;
  analyticsEnabled: boolean;
}

export interface TenantLimits {
  maxStudents: number;
  maxSheikhs: number;
  maxCircles: number;
  maxStorageMb: number;
  maxMonthlyAiRequests: number;
}

@Schema({ collection: 'tenant_branding', timestamps: true })
export class TenantBranding {
  @Prop({ required: true, unique: true })
  tenantId: string;

  @Prop()
  logoUrl?: string;

  @Prop()
  faviconUrl?: string;

  @Prop({ type: Object })
  colors?: ColorPalette;

  @Prop({ type: [String], default: ['ar'] })
  supportedLanguages: string[];

  @Prop({ default: 'ar' })
  defaultLanguage: string;

  @Prop({ type: Object })
  features?: FeatureFlags;

  @Prop({ type: Object })
  limits?: TenantLimits;

  @Prop()
  customDomain?: string;

  @Prop()
  tagline?: string;

  @Prop()
  supportEmail?: string;

  @Prop()
  supportPhone?: string;

  @Prop({ type: Object })
  socialLinks?: Record<string, string>;
}

export const TenantBrandingSchema = SchemaFactory.createForClass(TenantBranding);
// Uniqueness (one branding document per tenant) is enforced at the application layer.
// BaseSchema already declares index: true on tenantId; a duplicate standalone
// { tenantId: 1 } index here would cause a Mongoose duplicate-index warning.
