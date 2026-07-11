import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Parent, ParentDocument } from '@database/mongoose/schemas';
import {
  CreateParentInput,
  IParentRepository,
  ParentRecord,
  UpdateParentInput,
} from '../../domain/repositories/parent.repository.interface';

@Injectable()
export class ParentRepository implements IParentRepository {
  constructor(@InjectModel(Parent.name) private readonly model: Model<ParentDocument>) {}

  async create(input: CreateParentInput): Promise<ParentRecord> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      user: new Types.ObjectId(input.userId),
      relationship: input.relationship,
    });
    return toRecord(doc);
  }

  async findByUserId(tenantId: string, userId: string): Promise<ParentRecord | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    const doc = await this.model
      .findOne({ tenantId: new Types.ObjectId(tenantId), user: new Types.ObjectId(userId), isDeleted: false })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async findById(tenantId: string, parentId: string): Promise<ParentRecord | null> {
    if (!Types.ObjectId.isValid(parentId)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(parentId), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async findAll(tenantId: string): Promise<ParentRecord[]> {
    const docs = await this.model
      .find({ tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toRecord);
  }

  async update(tenantId: string, parentId: string, input: UpdateParentInput): Promise<ParentRecord> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(parentId), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: input },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Parent not found.');
    return toRecord(doc);
  }

  async addChild(tenantId: string, parentId: string, studentId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(parentId), tenantId: new Types.ObjectId(tenantId) },
      { $addToSet: { students: new Types.ObjectId(studentId) } },
    );
  }

  async removeChild(tenantId: string, parentId: string, studentId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(parentId), tenantId: new Types.ObjectId(tenantId) },
      { $pull: { students: new Types.ObjectId(studentId) } },
    );
  }
}

function toRecord(doc: any): ParentRecord {
  return {
    id: String(doc._id),
    userId: String(doc.user),
    studentIds: (doc.students ?? []).map(String),
    relationship: doc.relationship,
    receiveProgressReports: doc.receiveProgressReports ?? true,
  };
}
