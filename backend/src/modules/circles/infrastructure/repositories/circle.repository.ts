import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group, GroupDocument } from '@database/mongoose/schemas';
import {
  CircleRecord,
  CreateCircleInput,
  ICircleRepository,
  UpdateCircleInput,
} from '../../domain/repositories/circle.repository.interface';

@Injectable()
export class CircleRepository implements ICircleRepository {
  constructor(@InjectModel(Group.name) private readonly model: Model<GroupDocument>) {}

  async create(input: CreateCircleInput): Promise<CircleRecord> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      name: input.name,
      description: input.description,
      capacity: input.capacity,
      sheikh: input.sheikhId ? new Types.ObjectId(input.sheikhId) : null,
      supervisor: input.supervisorId ? new Types.ObjectId(input.supervisorId) : null,
      targetJuzStart: input.targetJuzStart,
      targetJuzEnd: input.targetJuzEnd,
      schedule: input.schedule,
    });
    return toRecord(doc);
  }

  async findById(tenantId: string, circleId: string): Promise<CircleRecord | null> {
    if (!Types.ObjectId.isValid(circleId)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(circleId), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async findAll(tenantId: string, filter?: { sheikhId?: string; supervisorId?: string; isActive?: boolean }): Promise<CircleRecord[]> {
    const query: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    if (filter?.isActive !== undefined) query.isActive = filter.isActive;
    if (filter?.sheikhId) query.sheikh = new Types.ObjectId(filter.sheikhId);
    if (filter?.supervisorId) query.supervisor = new Types.ObjectId(filter.supervisorId);
    const docs = await this.model.find(query).sort({ name: 1 }).lean();
    return docs.map(toRecord);
  }

  async findBySupervisor(tenantId: string, supervisorId: string): Promise<CircleRecord[]> {
    if (!Types.ObjectId.isValid(supervisorId)) return [];
    const docs = await this.model
      .find({ tenantId: new Types.ObjectId(tenantId), supervisor: new Types.ObjectId(supervisorId), isDeleted: false })
      .lean();
    return docs.map(toRecord);
  }

  async update(tenantId: string, circleId: string, input: UpdateCircleInput): Promise<CircleRecord> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(circleId), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: input },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Circle not found.');
    return toRecord(doc);
  }

  async setSheikh(tenantId: string, circleId: string, sheikhId: string | null): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(circleId), tenantId: new Types.ObjectId(tenantId) },
      { $set: { sheikh: sheikhId ? new Types.ObjectId(sheikhId) : null } },
    );
  }

  async setSupervisor(tenantId: string, circleId: string, supervisorId: string | null): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(circleId), tenantId: new Types.ObjectId(tenantId) },
      { $set: { supervisor: supervisorId ? new Types.ObjectId(supervisorId) : null } },
    );
  }

  async remove(tenantId: string, circleId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(circleId), tenantId: new Types.ObjectId(tenantId) },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
  }

  async addStudent(tenantId: string, circleId: string, studentId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(circleId), tenantId: new Types.ObjectId(tenantId) },
      { $addToSet: { students: new Types.ObjectId(studentId) } },
    );
  }

  async removeStudent(tenantId: string, circleId: string, studentId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(circleId), tenantId: new Types.ObjectId(tenantId) },
      { $pull: { students: new Types.ObjectId(studentId) } },
    );
  }
}

function toRecord(doc: any): CircleRecord {
  return {
    id: String(doc._id),
    name: doc.name,
    description: doc.description,
    capacity: doc.capacity,
    sheikhId: doc.sheikh ? String(doc.sheikh) : null,
    supervisorId: doc.supervisor ? String(doc.supervisor) : null,
    studentIds: (doc.students ?? []).map(String),
    targetJuzStart: doc.targetJuzStart,
    targetJuzEnd: doc.targetJuzEnd,
    schedule: doc.schedule,
    isActive: doc.isActive,
  };
}
