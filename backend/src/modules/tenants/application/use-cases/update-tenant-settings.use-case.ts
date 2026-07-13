import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TenantSettings, TenantSettingsDocument } from '@database/mongoose/schemas';
import { ITenantRepository, TENANT_REPOSITORY } from '../../domain/repositories/tenant.repository.interface';
import { UpdateTenantSettingsDto } from '../dto/update-tenant-settings.dto';

@Injectable()
export class UpdateTenantSettingsUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: ITenantRepository,
    @InjectModel(TenantSettings.name) private readonly settingsModel: Model<TenantSettingsDocument>,
  ) {}

  async execute(tenantId: string, dto: UpdateTenantSettingsDto): Promise<{ message: string }> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found.');

    const $set: Record<string, unknown> = {};
    if (dto.brandPrimaryColor !== undefined) $set['brandPrimaryColor'] = dto.brandPrimaryColor;
    if (dto.attendanceNotificationsEnabled !== undefined)
      $set['attendanceNotificationsEnabled'] = dto.attendanceNotificationsEnabled;
    if (dto.parentPortalEnabled !== undefined) $set['parentPortalEnabled'] = dto.parentPortalEnabled;
    if (dto.primaryLocale !== undefined) $set['primaryLocale'] = dto.primaryLocale;

    const tid = new Types.ObjectId(tenantId);
    await this.settingsModel.findOneAndUpdate(
      { tenant: tid },
      { $set: { ...($set), tenant: tid, tenantId: tid } },
      { upsert: true, new: true },
    );

    return { message: 'Tenant settings updated.' };
  }
}
