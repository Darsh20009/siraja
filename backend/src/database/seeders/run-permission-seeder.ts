import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Permission, PermissionSchema } from '@database/mongoose/schemas/permission.schema';
import { PermissionSeeder } from './permission.seeder';
import configuration from '@config/configuration';

/**
 * Standalone CLI entry point for `PermissionSeeder`.
 *
 * Usage (manual, not wired into any HTTP route — this phase builds no
 * APIs):
 *   ts-node -r tsconfig-paths/register src/database/seeders/run-permission-seeder.ts
 *
 * Deliberately a tiny, throwaway Nest application context (not the real
 * `AppModule`) — it needs nothing but a Mongo connection and the
 * `Permission` model, so it starts in milliseconds and can safely run in
 * CI/CD or a deploy hook without booting the full HTTP server.
 */
@Module({
  imports: [
    MongooseModule.forRoot(configuration().database.uri as string, {
      dbName: configuration().database.dbName,
    }),
    MongooseModule.forFeature([{ name: Permission.name, schema: PermissionSchema }]),
  ],
  providers: [PermissionSeeder],
})
class SeederModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeederModule);
  const seeder = app.get(PermissionSeeder);
  const result = await seeder.run();
  // eslint-disable-next-line no-console
  console.log(`Seeded ${result.upserted} changed / ${result.total} total permissions.`);
  await app.close();
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Permission seeding failed:', error);
  process.exit(1);
});
