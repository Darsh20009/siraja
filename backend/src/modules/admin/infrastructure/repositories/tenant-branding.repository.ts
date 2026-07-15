import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantBranding, TenantBrandingDocument } from '@database/mongoose/schemas';
import { ITenantBrandingRepository } from '../../domain/repositories/tenant-branding.repository.interface';

@Injectable()
export class TenantBrandingRepository implements ITenantBrandingRepository {
  constructor(@InjectModel(TenantBranding.name) private readonly model: Model<TenantBrandingDocument>) {}

  findByTenantId(tenantId: string) {
    return this.model.findOne({ tenantId }).exec();
  }

  async upsert(tenantId: string, data: Partial<TenantBranding>) {
    const doc = await this.model.findOneAndUpdate(
      { tenantId },
      { $set: { ...data, tenantId } },
      { upsert: true, new: true },
    ).exec();
    return doc!;
  }
}
