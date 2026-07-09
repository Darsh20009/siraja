import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from '@database/mongoose/schemas/permission.schema';
import { PERMISSION_REGISTRY } from '@shared/authorization/permission-registry';

/**
 * THE PERMISSION SEEDER
 * ======================
 * Idempotently syncs the global `permissions` collection (Phase 2 schema)
 * with `PERMISSION_REGISTRY` (this phase's single source of truth).
 * Upsert-only, keyed on `Permission.key` — safe to run on every
 * deployment: new permission keys are inserted, existing ones have their
 * `name`/`module` refreshed, and nothing is ever deleted here (a
 * permission key falling out of the registry is a deliberate, separate
 * decommissioning decision, not an automatic delete).
 *
 * Infrastructure/data-seeding, not application business logic — it does
 * not know about students, sessions, billing, or any domain rule; it
 * only mirrors a static config array into its collection.
 */
@Injectable()
export class PermissionSeeder {
  private readonly logger = new Logger(PermissionSeeder.name);

  constructor(@InjectModel(Permission.name) private readonly permissionModel: Model<PermissionDocument>) {}

  async run(): Promise<{ upserted: number; total: number }> {
    let upserted = 0;
    for (const definition of PERMISSION_REGISTRY) {
      const result = await this.permissionModel.updateOne(
        { key: definition.key },
        {
          $set: {
            name: definition.name,
            module: definition.module,
            isDeleted: false,
            deletedAt: null,
          },
          $setOnInsert: { key: definition.key },
        },
        { upsert: true },
      );
      if (result.upsertedCount > 0 || result.modifiedCount > 0) upserted += 1;
    }
    this.logger.log(`Permission seeder: synced ${upserted}/${PERMISSION_REGISTRY.length} permissions.`);
    return { upserted, total: PERMISSION_REGISTRY.length };
  }
}
