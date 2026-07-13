import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema, TenantSettings, TenantSettingsSchema } from '@database/mongoose/schemas';
import { TENANT_REPOSITORY } from './domain/repositories/tenant.repository.interface';
import { TenantRepository } from './infrastructure/repositories/tenant.repository';
import { CreateTenantUseCase } from './application/use-cases/create-tenant.use-case';
import { GetTenantUseCase } from './application/use-cases/get-tenant.use-case';
import { UpdateTenantUseCase } from './application/use-cases/update-tenant.use-case';
import { UpdateTenantSettingsUseCase } from './application/use-cases/update-tenant-settings.use-case';
import { TenantsController } from './infrastructure/controllers/tenants.controller';

/**
 * Tenants Module — Phase 12A
 *
 * Provides:
 *  POST   /tenants                    — create tenant (SUPER_ADMIN)
 *  GET    /tenants/current            — get current tenant + settings
 *  PATCH  /tenants/current            — update tenant branding/contact
 *  PATCH  /tenants/current/settings   — update feature flags / preferences
 *  GET    /tenants/current/logo-upload-url — presigned URL for logo upload
 *
 * `TENANT_REPOSITORY` is exported so TenantMiddleware (wired in AppModule)
 * can resolve a tenant by slug without reaching into Mongoose models itself.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: TenantSettings.name, schema: TenantSettingsSchema },
    ]),
  ],
  controllers: [TenantsController],
  providers: [
    { provide: TENANT_REPOSITORY, useClass: TenantRepository },
    CreateTenantUseCase,
    GetTenantUseCase,
    UpdateTenantUseCase,
    UpdateTenantSettingsUseCase,
  ],
  exports: [TENANT_REPOSITORY],
})
export class TenantsModule {}
