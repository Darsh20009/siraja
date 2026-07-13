import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant, TenantDocument, TenantSettings, TenantSettingsDocument } from '@database/mongoose/schemas';
import { TenantStatus, TenantType } from '@shared/enums/tenant-status.enum';
import { CreateTenantDto } from '../dto/create-tenant.dto';

const RESERVED_SLUGS = new Set([
  'api', 'admin', 'auth', 'app', 'www', 'mail', 'ftp', 'static',
  'platform', 'siraja', 'support', 'help', 'docs', 'blog',
]);

@Injectable()
export class CreateTenantUseCase {
  private readonly logger = new Logger(CreateTenantUseCase.name);

  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(TenantSettings.name) private readonly settingsModel: Model<TenantSettingsDocument>,
  ) {}

  async execute(dto: CreateTenantDto) {
    if (RESERVED_SLUGS.has(dto.slug)) {
      throw new BadRequestException(`Slug "${dto.slug}" is reserved and cannot be used.`);
    }

    const existing = await this.tenantModel.findOne({ slug: dto.slug }).exec();
    if (existing) {
      throw new BadRequestException(`A tenant with slug "${dto.slug}" already exists.`);
    }

    // Create a 30-day trial period by default
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Tenants are platform-global (not tenant-scoped) — they use a special
    // "platform" tenantId convention (see BaseGlobalSchema). We generate a
    // placeholder ObjectId that represents the platform itself.
    const platformId = new Types.ObjectId('000000000000000000000000');

    const tenant = await this.tenantModel.create({
      tenantId: platformId, // BaseGlobalSchema still has tenantId for index consistency
      name: dto.name,
      slug: dto.slug,
      type: dto.type ?? TenantType.ACADEMY,
      status: TenantStatus.TRIAL,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      timezone: dto.timezone ?? 'Asia/Riyadh',
      defaultLocale: dto.defaultLocale ?? 'ar',
      trialEndsAt,
    });

    // Seed default settings for the new tenant
    await this.settingsModel.create({
      tenantId: tenant._id,
      tenant: tenant._id,
      primaryLocale: dto.defaultLocale ?? 'ar',
      supportedLocales: ['ar', 'en'],
      features: {},
      preferences: {},
      attendanceNotificationsEnabled: true,
      parentPortalEnabled: true,
    });

    this.logger.log(`Tenant created: ${tenant.slug} (${(tenant._id as Types.ObjectId).toHexString()})`);

    return {
      id: (tenant._id as Types.ObjectId).toHexString(),
      name: tenant.name,
      slug: tenant.slug,
      type: tenant.type,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
      createdAt: (tenant as any).createdAt,
    };
  }
}
