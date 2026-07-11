import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Student, StudentDocument } from '@database/mongoose/schemas';
import {
  CreateStudentInput,
  IStudentRepository,
  StudentRecord,
  UpdateStudentInput,
} from '../../domain/repositories/student.repository.interface';

@Injectable()
export class StudentRepository implements IStudentRepository {
  constructor(@InjectModel(Student.name) private readonly model: Model<StudentDocument>) {}

  async create(input: CreateStudentInput): Promise<StudentRecord> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      user: new Types.ObjectId(input.userId),
      dateOfBirth: input.dateOfBirth,
      notes: input.notes,
    });
    return toRecord(doc);
  }

  async findByUserId(tenantId: string, userId: string): Promise<StudentRecord | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    const doc = await this.model
      .findOne({ tenantId: new Types.ObjectId(tenantId), user: new Types.ObjectId(userId), isDeleted: false })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async findById(tenantId: string, studentId: string): Promise<StudentRecord | null> {
    if (!Types.ObjectId.isValid(studentId)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(studentId), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async findAll(tenantId: string, filter?: { isActive?: boolean; groupId?: string; sheikhId?: string }): Promise<StudentRecord[]> {
    const query: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    if (filter?.isActive !== undefined) query.isActive = filter.isActive;
    if (filter?.groupId) query.group = new Types.ObjectId(filter.groupId);
    if (filter?.sheikhId) query.sheikh = new Types.ObjectId(filter.sheikhId);
    const docs = await this.model.find(query).sort({ enrolledAt: -1 }).lean();
    return docs.map(toRecord);
  }

  async findByCircle(tenantId: string, groupId: string): Promise<StudentRecord[]> {
    if (!Types.ObjectId.isValid(groupId)) return [];
    const docs = await this.model
      .find({ tenantId: new Types.ObjectId(tenantId), group: new Types.ObjectId(groupId), isDeleted: false })
      .lean();
    return docs.map(toRecord);
  }

  async findByParent(tenantId: string, parentId: string): Promise<StudentRecord[]> {
    if (!Types.ObjectId.isValid(parentId)) return [];
    // parent document id corresponds to parent._id stored in student.parents
    const docs = await this.model
      .find({ tenantId: new Types.ObjectId(tenantId), parents: new Types.ObjectId(parentId), isDeleted: false })
      .lean();
    return docs.map(toRecord);
  }

  /**
   * Returns all students the sheikh has access to:
   *   (a) students directly assigned to this sheikh (student.sheikh === sheikhId)
   *   (b) students enrolled in any of the sheikh's circles (student.group in circleIds)
   *
   * `circleIds` should be the sheikh's `groupIds` from their SheikhRecord; the
   * caller (use-case layer) resolves them so this repository stays single-model.
   */
  async findBySheikh(tenantId: string, sheikhId: string, circleIds: string[] = []): Promise<StudentRecord[]> {
    if (!Types.ObjectId.isValid(sheikhId)) return [];

    const $or: Record<string, unknown>[] = [{ sheikh: new Types.ObjectId(sheikhId) }];
    const validCircleIds = circleIds.filter((id) => Types.ObjectId.isValid(id));
    if (validCircleIds.length > 0) {
      $or.push({ group: { $in: validCircleIds.map((id) => new Types.ObjectId(id)) } });
    }

    const docs = await this.model
      .find({ tenantId: new Types.ObjectId(tenantId), isDeleted: false, $or })
      .sort({ enrolledAt: -1 })
      .lean();
    return docs.map(toRecord);
  }

  async update(tenantId: string, studentId: string, input: UpdateStudentInput): Promise<StudentRecord> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(studentId), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: removeUndefined(input as Record<string, unknown>) },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Student not found.');
    return toRecord(doc);
  }

  async remove(tenantId: string, studentId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(studentId), tenantId: new Types.ObjectId(tenantId) },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
  }

  async setGroup(tenantId: string, studentId: string, groupId: string | null): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(studentId), tenantId: new Types.ObjectId(tenantId) },
      { $set: { group: groupId ? new Types.ObjectId(groupId) : null } },
    );
  }

  async setSheikh(tenantId: string, studentId: string, sheikhId: string | null): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(studentId), tenantId: new Types.ObjectId(tenantId) },
      { $set: { sheikh: sheikhId ? new Types.ObjectId(sheikhId) : null } },
    );
  }

  async addParent(tenantId: string, studentId: string, parentId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(studentId), tenantId: new Types.ObjectId(tenantId) },
      { $addToSet: { parents: new Types.ObjectId(parentId) } },
    );
  }

  async removeParent(tenantId: string, studentId: string, parentId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(studentId), tenantId: new Types.ObjectId(tenantId) },
      { $pull: { parents: new Types.ObjectId(parentId) } },
    );
  }
}

function toRecord(doc: any): StudentRecord {
  return {
    id: String(doc._id),
    userId: String(doc.user),
    groupId: doc.group ? String(doc.group) : null,
    sheikhId: doc.sheikh ? String(doc.sheikh) : null,
    parentIds: (doc.parents ?? []).map(String),
    dateOfBirth: doc.dateOfBirth,
    enrolledAt: doc.enrolledAt,
    currentMemorizationStatus: doc.currentMemorizationStatus,
    currentJuzNumber: doc.currentJuzNumber,
    isActive: doc.isActive,
    notes: doc.notes,
  };
}

function removeUndefined(obj: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
