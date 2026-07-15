import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RewardRule, RewardRuleDocument } from '@database/mongoose/schemas';
import {
  IRewardRuleRepository,
  CreateRewardRuleData,
} from '../../domain/repositories/reward-rule.repository.interface';

@Injectable()
export class RewardRuleRepository implements IRewardRuleRepository {
  constructor(
    @InjectModel(RewardRule.name)
    private readonly model: Model<RewardRuleDocument>,
  ) {}

  findAll(tenantId: string, onlyActive = false): Promise<RewardRuleDocument[]> {
    const filter: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    if (onlyActive) filter['isActive'] = true;
    return this.model.find(filter).sort({ createdAt: 1 }).exec();
  }

  findById(tenantId: string, id: string): Promise<RewardRuleDocument | null> {
    return this.model.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).exec();
  }

  create(data: CreateRewardRuleData): Promise<RewardRuleDocument> {
    return this.model.create({
      ...data,
      tenantId: new Types.ObjectId(data.tenantId),
      createdBy: data.createdBy ? new Types.ObjectId(data.createdBy) : undefined,
    });
  }

  async update(tenantId: string, id: string, data: Partial<RewardRuleDocument>): Promise<RewardRuleDocument | null> {
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
