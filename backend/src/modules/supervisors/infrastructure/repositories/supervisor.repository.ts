import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Supervisor, SupervisorDocument } from '@database/mongoose/schemas';
import {
  CreateSupervisorInput,
  ISupervisorRepository,
  SupervisorRecord,
  UpdateSupervisorInput,
} from '../../domain/repositories/supervisor.repository.interface';

@Injectable()
export class SupervisorRepository implements ISupervisorRepository {
  constructor(@InjectModel(Supervisor.name) private readonly model: Model<SupervisorDocument>) {}

  async create(input: CreateSupervisorInput): Promise<SupervisorRecord> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      user: new Types.ObjectId(input.userId),
      department: input.department,
    });
    return toRecord(doc);
  }

  async findByUserId(tenantId: string, userId: string): Promise<SupervisorRecord | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    const doc = await this.model
      .findOne({ tenantId: new Types.ObjectId(tenantId), user: new Types.ObjectId(userId), isDeleted: false })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async findById(tenantId: string, supervisorId: string): Promise<SupervisorRecord | null> {
    if (!Types.ObjectId.isValid(supervisorId)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(supervisorId), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async findAll(tenantId: string, filter?: { isActive?: boolean }): Promise<SupervisorRecord[]> {
    const query: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    if (filter?.isActive !== undefined) query.isActive = filter.isActive;
    const docs = await this.model.find(query).sort({ createdAt: -1 }).lean();
    return docs.map(toRecord);
  }

  async update(tenantId: string, supervisorId: string, input: UpdateSupervisorInput): Promise<SupervisorRecord> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(supervisorId), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: input },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Supervisor not found.');
    return toRecord(doc);
  }

  async addGroup(tenantId: string, supervisorId: string, groupId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(supervisorId), tenantId: new Types.ObjectId(tenantId) },
      { $addToSet: { supervisedGroups: new Types.ObjectId(groupId) } },
    );
  }

  async removeGroup(tenantId: string, supervisorId: string, groupId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(supervisorId), tenantId: new Types.ObjectId(tenantId) },
      { $pull: { supervisedGroups: new Types.ObjectId(groupId) } },
    );
  }
}

function toRecord(doc: any): SupervisorRecord {
  return {
    id: String(doc._id),
    userId: String(doc.user),
    supervisedGroupIds: (doc.supervisedGroups ?? []).map(String),
    department: doc.department,
    isActive: doc.isActive,
  };
}
