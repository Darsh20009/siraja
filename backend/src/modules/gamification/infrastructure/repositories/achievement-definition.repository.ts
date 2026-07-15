import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AchievementDefinition, AchievementDefinitionDocument } from '@database/mongoose/schemas';
import {
  IAchievementDefinitionRepository,
  CreateAchievementDefinitionData,
} from '../../domain/repositories/achievement-definition.repository.interface';
import { DEFAULT_ACHIEVEMENTS } from '../../application/services/achievement-engine.service';

@Injectable()
export class AchievementDefinitionRepository implements IAchievementDefinitionRepository {
  constructor(
    @InjectModel(AchievementDefinition.name)
    private readonly model: Model<AchievementDefinitionDocument>,
  ) {}

  findAll(tenantId: string, onlyActive = false): Promise<AchievementDefinitionDocument[]> {
    const filter: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    if (onlyActive) filter['isActive'] = true;
    return this.model.find(filter).sort({ sortOrder: 1 }).exec();
  }

  findById(tenantId: string, id: string): Promise<AchievementDefinitionDocument | null> {
    return this.model.findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false }).exec();
  }

  findByType(tenantId: string, type: string): Promise<AchievementDefinitionDocument | null> {
    return this.model.findOne({ tenantId: new Types.ObjectId(tenantId), type, isDeleted: false }).exec();
  }

  create(data: CreateAchievementDefinitionData): Promise<AchievementDefinitionDocument> {
    return this.model.create({ ...data, tenantId: new Types.ObjectId(data.tenantId) });
  }

  async update(tenantId: string, id: string, data: Partial<AchievementDefinitionDocument>): Promise<AchievementDefinitionDocument | null> {
    return this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
      { $set: data },
      { new: true },
    ).exec();
  }

  async seedDefaults(tenantId: string): Promise<void> {
    for (const def of DEFAULT_ACHIEVEMENTS) {
      const existing = await this.findByType(tenantId, def.type);
      if (!existing) {
        await this.model.create({
          tenantId: new Types.ObjectId(tenantId),
          type: def.type,
          name: def.name,
          description: def.description,
          isAutomatic: def.type !== 'teacher_choice_award',
          bonusPoints: def.bonusPoints,
          sortOrder: def.sortOrder,
          isActive: true,
          isRepeatable: false,
        });
      }
    }
  }
}
