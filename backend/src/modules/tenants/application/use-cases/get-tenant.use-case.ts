import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TenantSettings, TenantSettingsDocument } from '@database/mongoose/schemas';
import { ITenantRepository, TENANT_REPOSITORY } from '../../domain/repositories/tenant.repository.interface';

@Injectable()
export class GetTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: ITenantRepository,
    @InjectModel(TenantSettings.name) private readonly settingsModel: Model<TenantSettingsDocument>,
  ) {}

  async execute(tenantId: string) {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found.');

    const settings = await this.settingsModel.findOne({
      tenant: new Types.ObjectId(tenantId),
    });

    return {
      id: (tenant._id as Types.ObjectId).toHexString(),
      name: tenant.name,
      slug: tenant.slug,
      type: tenant.type,
      status: tenant.status,
      logoUrl: tenant.logoUrl,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      timezone: tenant.timezone,
      defaultLocale: tenant.defaultLocale,
      trialEndsAt: tenant.trialEndsAt,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      settings: settings
        ? {
            primaryLocale: settings.primaryLocale,
            supportedLocales: settings.supportedLocales,
            brandPrimaryColor: settings.brandPrimaryColor,
            attendanceNotificationsEnabled: settings.attendanceNotificationsEnabled,
            parentPortalEnabled: settings.parentPortalEnabled,
          }
        : null,
    };
  }
}
