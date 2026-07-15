import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BadgeDefinition, BadgeDefinitionDocument } from '@database/mongoose/schemas';
import {
  IBadgeDefinitionRepository,
  CreateBadgeDefinitionData,
} from '../../domain/repositories/badge-definition.repository.interface';
import { BadgeTier, BadgeType } from '@shared/enums/gamification.enum';

@Injectable()
export class BadgeDefinitionRepository implements IBadgeDefinitionRepository {
  constructor(
    @InjectModel(BadgeDefinition.name)
    private readonly model: Model<BadgeDefinitionDocument>,
  ) {}

  findAll(tenantId: string, onlyActive = false): Promise<BadgeDefinitionDocument[]> {
    const filter: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    if (onlyActive) filter['isActive'] = true;
    return this.model.find(filter).sort({ sortOrder: 1 }).exec();
  }

  findById(tenantId: string, id: string): Promise<BadgeDefinitionDocument | null> {
    return this.model.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).exec();
  }

  findByTierAndType(tenantId: string, tier?: BadgeTier, type?: BadgeType): Promise<BadgeDefinitionDocument[]> {
    const filter: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    if (tier) filter['tier'] = tier;
    if (type) filter['type'] = type;
    return this.model.find(filter).sort({ sortOrder: 1 }).exec();
  }

  create(data: CreateBadgeDefinitionData): Promise<BadgeDefinitionDocument> {
    return this.model.create({ ...data, tenantId: new Types.ObjectId(data.tenantId) });
  }

  async update(tenantId: string, id: string, data: Partial<BadgeDefinitionDocument>): Promise<BadgeDefinitionDocument | null> {
    return this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
      { $set: data },
      { new: true },
    ).exec();
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    ).exec();
  }
}
