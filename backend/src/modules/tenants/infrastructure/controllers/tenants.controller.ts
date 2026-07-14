import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { STORAGE_PROVIDER, IStorageProvider } from '@shared/storage/storage-provider.interface';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Roles } from '@common/decorators/roles.decorator';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { Role } from '@shared/enums/roles.enum';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
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
   * Create a new tenant. Restricted to SUPER_ADMIN — platform-level operation.
   * Tenant admins cannot create additional tenants; only platform admins can.
   */
  @Post()
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tenant (SUPER_ADMIN only)' })
  create(@Body() dto: CreateTenantDto) {
    return this.createTenant.execute(dto);
  }

  /**
   * Get the current tenant resolved from the authenticated user's tenantId.
   * Any authenticated user within a tenant may read their own tenant info.
   */
  @Get('current')
  @ApiOperation({ summary: 'Get current tenant details and settings' })
  getCurrent(@CurrentUser() user: AccessTokenPayload) {
    return this.getTenant.execute(user.tenantId);
  }

  /**
   * Update branding / contact details for the current tenant.
   * Requires SETTINGS.UPDATE permission (TENANT_ADMIN and SUPER_ADMIN).
   */
  @Patch('current')
  @RequirePermissions(PERMISSIONS.SETTINGS.UPDATE!)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current tenant (name, logo, contact, timezone)' })
  updateCurrent(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateTenantDto) {
    return this.updateTenant.execute(user.tenantId, dto);
  }

  /**
   * Update feature flags and preferences for the current tenant.
   * Requires SETTINGS.UPDATE permission (TENANT_ADMIN and SUPER_ADMIN).
   */
  @Patch('current/settings')
  @RequirePermissions(PERMISSIONS.SETTINGS.UPDATE!)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tenant settings (branding color, feature flags)' })
  updateCurrentSettings(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateTenantSettingsDto) {
    return this.updateSettings.execute(user.tenantId, dto);
  }

  /**
   * Get a presigned URL so the client can upload a logo directly to storage.
   * The client uploads, then calls PATCH /tenants/current with the resulting URL.
   * Requires SETTINGS.UPDATE permission (TENANT_ADMIN and SUPER_ADMIN).
   */
  @Get('current/logo-upload-url')
  @RequirePermissions(PERMISSIONS.SETTINGS.UPDATE!)
  @ApiOperation({ summary: 'Get a presigned URL for logo upload (TENANT_ADMIN+)' })
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
