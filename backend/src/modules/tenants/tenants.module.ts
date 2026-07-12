import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from '@database/mongoose/schemas';
import { TENANT_REPOSITORY } from './domain/repositories/tenant.repository.interface';
import { TenantRepository } from './infrastructure/repositories/tenant.repository';

/**
 * Tenants Module
 *
 * Encapsulates the tenants bounded context following Clean Architecture:
 * - domain: entities, value objects, repository interfaces (no framework deps)
 * - application: use cases (business rules) and DTOs
 * - infrastructure: controllers, Mongoose schemas/repositories, external adapters
 *
 * `TENANT_REPOSITORY` is exported so `TenantMiddleware` (wired directly in
 * `AppModule`, which imports this module) can resolve a tenant by slug
 * without reaching into Mongoose models itself.
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }])],
  controllers: [],
  providers: [{ provide: TENANT_REPOSITORY, useClass: TenantRepository }],
  exports: [TENANT_REPOSITORY],
})
export class TenantsModule {}
