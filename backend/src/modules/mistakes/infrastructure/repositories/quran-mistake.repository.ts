import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QuranMistake, QuranMistakeDocument } from '@database/mongoose/schemas';
import {
  IQuranMistakeRepository,
  LogMistakeInput,
  MistakeFrequencyItem,
  MistakeListFilter,
  QuranMistakeItem,
} from '../../domain/repositories/quran-mistake.repository.interface';
import { MistakeResolutionStatus } from '@shared/enums/memorization.enum';

@Injectable()
export class QuranMistakeRepository implements IQuranMistakeRepository {
  constructor(
    @InjectModel(QuranMistake.name)
    private readonly model: Model<QuranMistakeDocument>,
  ) {}

  async log(input: LogMistakeInput): Promise<QuranMistakeItem> {
    const doc = await this.model.create({
      tenantId: new Types.ObjectId(input.tenantId),
      student: new Types.ObjectId(input.studentId),
      memorizationRecord: input.memorizationRecordId
        ? new Types.ObjectId(input.memorizationRecordId)
        : undefined,
      reviewRecord: input.reviewRecordId ? new Types.ObjectId(input.reviewRecordId) : undefined,
      surahNumber: input.surahNumber,
      ayahNumber: input.ayahNumber,
      type: input.type,
      severity: input.severity,
      note: input.note,
      resolutionStatus: MistakeResolutionStatus.OPEN,
      resolvedAt: null,
      resolvedBy: null,
    });
    return toRecord(doc.toObject());
  }

  async findById(tenantId: string, id: string): Promise<QuranMistakeItem | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async findAll(
    tenantId: string,
    filter: MistakeListFilter,
    page = 1,
    limit = 50,
  ): Promise<{ items: QuranMistakeItem[]; total: number }> {
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
    if (filter.memorizationRecordId && Types.ObjectId.isValid(filter.memorizationRecordId))
      query.memorizationRecord = new Types.ObjectId(filter.memorizationRecordId);
    if (filter.reviewRecordId && Types.ObjectId.isValid(filter.reviewRecordId))
      query.reviewRecord = new Types.ObjectId(filter.reviewRecordId);
    if (filter.type) query.type = filter.type;
    if (filter.severity) query.severity = filter.severity;
    if (filter.resolutionStatus) query.resolutionStatus = filter.resolutionStatus;
    if (filter.surahNumber) query.surahNumber = filter.surahNumber;

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);

    return { items: docs.map(toRecord), total };
  }

  async resolve(tenantId: string, id: string, resolvedById: string): Promise<QuranMistakeItem> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        {
          $set: {
            resolutionStatus: MistakeResolutionStatus.RESOLVED,
            resolvedAt: new Date(),
            resolvedBy: new Types.ObjectId(resolvedById),
          },
        },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Mistake not found.');
    return toRecord(doc);
  }

  async getFrequency(
    tenantId: string,
    studentId: string,
    surahNumber?: number,
  ): Promise<MistakeFrequencyItem[]> {
    if (!Types.ObjectId.isValid(studentId)) return [];

    const match: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      student: new Types.ObjectId(studentId),
      isDeleted: false,
    };
    if (surahNumber) match.surahNumber = surahNumber;

    const groupId: Record<string, unknown> = { type: '$type' };
    if (surahNumber) groupId.surahNumber = '$surahNumber';

    const results = await this.model.aggregate([
      { $match: match },
      { $group: { _id: groupId, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return results.map((r) => ({
      type: r._id.type,
      count: r.count,
      surahNumber: r._id.surahNumber,
    }));
  }
}

function toRecord(doc: any): QuranMistakeItem {
  return {
    id: String(doc._id),
    studentId: String(doc.student),
    memorizationRecordId: doc.memorizationRecord ? String(doc.memorizationRecord) : undefined,
    reviewRecordId: doc.reviewRecord ? String(doc.reviewRecord) : undefined,
    surahNumber: doc.surahNumber,
    ayahNumber: doc.ayahNumber,
    type: doc.type,
    severity: doc.severity,
    note: doc.note,
    resolutionStatus: doc.resolutionStatus,
    resolvedAt: doc.resolvedAt,
    resolvedById: doc.resolvedBy ? String(doc.resolvedBy) : null,
    createdAt: doc.createdAt,
  };
}
