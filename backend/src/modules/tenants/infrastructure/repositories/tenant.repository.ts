import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Tenant, TenantDocument } from '@database/mongoose/schemas';
import { ITenantRepository } from '../../domain/repositories/tenant.repository.interface';

@Injectable()
export class TenantRepository implements ITenantRepository {
  constructor(@InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>) {}

  findBySlug(slug: string): Promise<TenantDocument | null> {
    return this.tenantModel.findOne({ slug, isDeleted: { $ne: true } }).exec();
  }

  findById(id: string): Promise<TenantDocument | null> {
    if (!isValidObjectId(id)) return Promise.resolve(null);
    return this.tenantModel.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
  }
}
