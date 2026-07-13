import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Inject } from '@nestjs/common';
import { STORAGE_PROVIDER, IStorageProvider } from '@shared/storage/storage-provider.interface';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { CreateTenantDto } from '../../application/dto/create-tenant.dto';
import { UpdateTenantDto } from '../../application/dto/update-tenant.dto';
import { UpdateTenantSettingsDto } from '../../application/dto/update-tenant-settings.dto';
import { CreateTenantUseCase } from '../../application/use-cases/create-tenant.use-case';
import { GetTenantUseCase } from '../../application/use-cases/get-tenant.use-case';
import { UpdateTenantUseCase } from '../../application/use-cases/update-tenant.use-case';
import { UpdateTenantSettingsUseCase } from '../../application/use-cases/update-tenant-settings.use-case';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly createTenant: CreateTenantUseCase,
    private readonly getTenant: GetTenantUseCase,
    private readonly updateTenant: UpdateTenantUseCase,
    private readonly updateSettings: UpdateTenantSettingsUseCase,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {}

  /**
   * Create a new tenant. Only SUPER_ADMIN should call this.
   * (Full RBAC guard to be wired in Phase 12B — currently any authenticated user can call.)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tenant (SUPER_ADMIN)' })
  create(@Body() dto: CreateTenantDto) {
    return this.createTenant.execute(dto);
  }

  /** Get the current tenant resolved from the X-Tenant-Slug header. */
  @Get('current')
  @ApiOperation({ summary: 'Get current tenant details and settings' })
  getCurrent(@CurrentUser() user: AccessTokenPayload) {
    return this.getTenant.execute(user.tenantId);
  }

  /** Update branding / contact details for the current tenant. */
  @Patch('current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current tenant (name, logo, contact, timezone)' })
  updateCurrent(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateTenantDto) {
    return this.updateTenant.execute(user.tenantId, dto);
  }

  /** Update feature flags and preferences for the current tenant. */
  @Patch('current/settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tenant settings (branding color, feature flags)' })
  updateCurrentSettings(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateTenantSettingsDto) {
    return this.updateSettings.execute(user.tenantId, dto);
  }

  /**
   * Get a presigned URL so the client can upload a logo directly to storage.
   * The client uploads, then calls PATCH /tenants/current with the resulting URL.
   */
  @Get('current/logo-upload-url')
  @ApiOperation({ summary: 'Get a presigned URL for logo upload' })
  async getLogoUploadUrl(@CurrentUser() user: AccessTokenPayload) {
    const key = `tenants/${user.tenantId}/logo-${Date.now()}.png`;
    const uploadUrl = await this.storage.getSignedUploadUrl({
      key,
      contentType: 'image/png',
      expiresInSeconds: 300,
      maxSizeBytes: 2 * 1024 * 1024, // 2MB
    });
    return { uploadUrl, key };
  }
}
