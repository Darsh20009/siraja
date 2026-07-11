import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sheikh, SheikhDocument } from '@database/mongoose/schemas';
import {
  CreateSheikhInput,
  ISheikhRepository,
  SheikhRecord,
  UpdateSheikhInput,
} from '../../domain/repositories/sheikh.repository.interface';

@Injectable()
export class SheikhRepository implements ISheikhRepository {
  constructor(@InjectModel(Sheikh.name) private readonly model: Model<SheikhDocument>) {}

  async create(input: CreateSheikhInput): Promise<SheikhRecord> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      user: new Types.ObjectId(input.userId),
      qualifications: input.qualifications ?? [],
      yearsOfExperience: input.yearsOfExperience,
      bio: input.bio,
    });
    return toRecord(doc);
  }

  async findByUserId(tenantId: string, userId: string): Promise<SheikhRecord | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    const doc = await this.model
      .findOne({ tenantId: new Types.ObjectId(tenantId), user: new Types.ObjectId(userId), isDeleted: false })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async findById(tenantId: string, sheikhId: string): Promise<SheikhRecord | null> {
    if (!Types.ObjectId.isValid(sheikhId)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(sheikhId), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async findAll(tenantId: string, filter?: { isActive?: boolean }): Promise<SheikhRecord[]> {
    const query: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    if (filter?.isActive !== undefined) query.isActive = filter.isActive;
    const docs = await this.model.find(query).sort({ createdAt: -1 }).lean();
    return docs.map(toRecord);
  }

  async update(tenantId: string, sheikhId: string, input: UpdateSheikhInput): Promise<SheikhRecord> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(sheikhId), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: input },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Sheikh not found.');
    return toRecord(doc);
  }

  async addGroup(tenantId: string, sheikhId: string, groupId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(sheikhId), tenantId: new Types.ObjectId(tenantId) },
      { $addToSet: { groups: new Types.ObjectId(groupId) } },
    );
  }

  async removeGroup(tenantId: string, sheikhId: string, groupId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(sheikhId), tenantId: new Types.ObjectId(tenantId) },
      { $pull: { groups: new Types.ObjectId(groupId) } },
    );
  }
}

function toRecord(doc: any): SheikhRecord {
  return {
    id: String(doc._id),
    userId: String(doc.user),
    groupIds: (doc.groups ?? []).map(String),
    qualifications: doc.qualifications ?? [],
    yearsOfExperience: doc.yearsOfExperience,
    bio: doc.bio,
    isActive: doc.isActive,
  };
}
