import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant, TenantDocument } from '@database/mongoose/schemas';
import { ITenantRepository, TENANT_REPOSITORY } from '../../domain/repositories/tenant.repository.interface';
import { UpdateTenantDto } from '../dto/update-tenant.dto';

@Injectable()
export class UpdateTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: ITenantRepository,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  async execute(tenantId: string, dto: UpdateTenantDto): Promise<{ message: string }> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found.');

    const $set: Record<string, unknown> = {};
    if (dto.name !== undefined) $set['name'] = dto.name;
    if (dto.contactEmail !== undefined) $set['contactEmail'] = dto.contactEmail;
    if (dto.contactPhone !== undefined) $set['contactPhone'] = dto.contactPhone;
    if (dto.timezone !== undefined) $set['timezone'] = dto.timezone;
    if (dto.defaultLocale !== undefined) $set['defaultLocale'] = dto.defaultLocale;
    if (dto.logoUrl !== undefined) $set['logoUrl'] = dto.logoUrl;

    if (Object.keys($set).length > 0) {
      await this.tenantModel.updateOne({ _id: new Types.ObjectId(tenantId) }, { $set }).exec();
    }

    return { message: 'Tenant updated successfully.' };
  }
}
