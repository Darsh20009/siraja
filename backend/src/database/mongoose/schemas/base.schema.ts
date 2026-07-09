import { Prop, Schema } from '@nestjs/mongoose';

/**
 * Shared Mongoose schema fields for every tenant-scoped collection.
 * `tenantId` is indexed and required on all collections so tenant
 * isolation is enforced at the persistence layer, not just the app layer.
 */
@Schema({ timestamps: true })
export class BaseSchema {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}
