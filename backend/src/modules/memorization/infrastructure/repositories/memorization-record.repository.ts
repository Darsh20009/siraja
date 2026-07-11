import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MemorizationRecord, MemorizationRecordDocument } from '@database/mongoose/schemas';
import {
  CreateMemorizationRecordInput,
  IMemorizationRecordRepository,
  MemorizationListFilter,
  MemorizationRecordItem,
  UpdateMemorizationRecordInput,
} from '../../domain/repositories/memorization-record.repository.interface';
import { MemorizationStatus } from '@shared/enums/memorization.enum';

@Injectable()
export class MemorizationRecordRepository implements IMemorizationRecordRepository {
  constructor(
    @InjectModel(MemorizationRecord.name)
    private readonly model: Model<MemorizationRecordDocument>,
  ) {}

  async create(input: CreateMemorizationRecordInput): Promise<MemorizationRecordItem> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      student: new Types.ObjectId(input.studentId),
      session: input.sessionId ? new Types.ObjectId(input.sessionId) : undefined,
      evaluatedBy: new Types.ObjectId(input.evaluatedById),
      range: input.range,
      notes: input.notes,
      status: MemorizationStatus.IN_PROGRESS,
      evaluatedAt: new Date(),
    });
    return toRecord(doc.toObject());
  }

  async findById(tenantId: string, id: string): Promise<MemorizationRecordItem | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async findAll(
    tenantId: string,
    filter: MemorizationListFilter,
    page = 1,
    limit = 20,
  ): Promise<{ items: MemorizationRecordItem[]; total: number }> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filter.studentId && Types.ObjectId.isValid(filter.studentId)) {
      query.student = new Types.ObjectId(filter.studentId);
    } else if (filter.studentIds && filter.studentIds.length > 0) {
      const validIds = filter.studentIds.filter((id) => Types.ObjectId.isValid(id));
      query.student = { $in: validIds.map((id) => new Types.ObjectId(id)) };
    }
    if (filter.evaluatedById && Types.ObjectId.isValid(filter.evaluatedById))
      query.evaluatedBy = new Types.ObjectId(filter.evaluatedById);
    if (filter.sessionId && Types.ObjectId.isValid(filter.sessionId))
      query.session = new Types.ObjectId(filter.sessionId);
    if (filter.status) query.status = filter.status;
    if (filter.fromDate || filter.toDate) {
      query.evaluatedAt = {
        ...(filter.fromDate ? { $gte: filter.fromDate } : {}),
        ...(filter.toDate ? { $lte: filter.toDate } : {}),
      };
    }

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.model.find(query).sort({ evaluatedAt: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);

    return { items: docs.map(toRecord), total };
  }

  async getStudentStats(
    tenantId: string,
    studentId: string,
  ): Promise<{ total: number; completed: number; totalAyahsMemorized: number }> {
    if (!Types.ObjectId.isValid(studentId)) return { total: 0, completed: 0, totalAyahsMemorized: 0 };

    const docs = await this.model
      .find({
        tenantId: new Types.ObjectId(tenantId),
        student: new Types.ObjectId(studentId),
        isDeleted: false,
      })
      .select('status range')
      .lean();

    let totalAyahsMemorized = 0;
    let completed = 0;

    for (const doc of docs) {
      if (doc.status === MemorizationStatus.COMPLETED) {
        completed++;
        const range = doc.range as any;
        if (range) {
          if (range.surahFrom === range.surahTo) {
            totalAyahsMemorized += Math.max(0, range.ayahTo - range.ayahFrom + 1);
          } else {
            totalAyahsMemorized += Math.max(1, (range.surahTo - range.surahFrom) * 10 + range.ayahTo - range.ayahFrom + 1);
          }
        }
      }
    }

    return { total: docs.length, completed, totalAyahsMemorized };
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateMemorizationRecordInput,
  ): Promise<MemorizationRecordItem> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        { $set: removeUndefined(input as Record<string, unknown>) },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Memorization record not found.');
    return toRecord(doc);
  }
}

function toRecord(doc: any): MemorizationRecordItem {
  return {
    id: String(doc._id),
    studentId: String(doc.student),
    sessionId: doc.session ? String(doc.session) : undefined,
    evaluatedById: String(doc.evaluatedBy),
    range: doc.range,
    status: doc.status,
    grade: doc.grade,
    score: doc.score,
    notes: doc.notes,
    evaluatedAt: doc.evaluatedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function removeUndefined(obj: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
